const crypto = require('crypto');
const redis = require('../config/redis.config');
const AppError = require('../utils/AppError');
const { OTP_CONFIG } = require('../constants/auth.constants');
const pino = require('pino')();

class OtpService {
  /**
   * Generate and store OTP
   */
  async generateOtp(email) {
    if (!redis) {
      pino.warn('Redis not available. Using 111111 as static OTP for development.');
      return '111111';
    }

    // Check throttle
    const lockKey = `otp:lock:${email}`;
    const isLocked = await redis.get(lockKey);
    if (isLocked) {
      throw new AppError('Please wait before requesting another OTP', 429, 'OTP_THROTTLED');
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = this._hashOtp(otp);

    const otpKey = `otp:${email}`;
    await redis.set(otpKey, hashedOtp, 'EX', OTP_CONFIG.EXPIRY_SECONDS);
    
    // Set resend lock
    await redis.set(lockKey, '1', 'EX', OTP_CONFIG.RESEND_THROTTLE_SECONDS);

    pino.info({ email, otp }, 'OTP Generated'); // In production, don't log OTP
    return otp;
  }

  /**
   * Verify OTP
   */
  async verifyOtp(email, otp) {
    if (!redis) {
      if (otp === '111111') return true;
      throw new AppError('Invalid OTP', 400, 'INVALID_OTP');
    }

    const otpKey = `otp:${email}`;
    const storedHash = await redis.get(otpKey);

    if (!storedHash) {
      throw new AppError('OTP expired or not found', 400, 'OTP_EXPIRED');
    }

    const hashedInput = this._hashOtp(otp);
    if (hashedInput !== storedHash) {
      // Brute force guard: Increment attempt counter or delete key on failure if needed
      throw new AppError('Invalid OTP', 400, 'INVALID_OTP');
    }

    // Success: Delete OTP
    await redis.del(otpKey);
    return true;
  }

  _hashOtp(otp) {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }
}

module.exports = new OtpService();
