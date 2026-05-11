const jwt = require('jsonwebtoken');
const env = require('../config/env.config');
const User = require('../models/User');
const otpService = require('./otp.service');
const AppError = require('../utils/AppError');

class AuthService {
  /**
   * Request OTP
   */
  async requestOtp(email) {
    const otp = await otpService.generateOtp(email);
    // TODO: Send email via mailService
    return { email };
  }

  /**
   * Verify OTP and login/register
   */
  async verifyOtp(email, otp) {
    await otpService.verifyOtp(email, otp);

    let user = await User.findOne({ email });

    if (!user) {
      // Auto-register if user doesn't exist
      user = await User.create({ email });
    }

    const tokens = this.generateTokens(user);
    return { user, tokens };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_TOKEN');
    }
  }

  generateTokens(user) {
    const accessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role, brand_id: user.brand_id },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRY }
    );

    return { access_token: accessToken, refresh_token: refreshToken };
  }
}

module.exports = new AuthService();
