const User = require('../models/User');
const jwt = require('jsonwebtoken');

class AuthService {
  async login(email, password) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT immediately (Skipping OTP for now)
    const token = jwt.sign(
      { id: user._id, brandId: user.brandId, role: user.role },
      process.env.JWT_SECRET || 'khikhi_secret_key',
      { expiresIn: '24h' }
    );

    user.lastLogin = new Date();
    await user.save();

    return { 
      token, 
      user: { id: user._id, email: user.email, role: user.role, brandId: user.brandId },
      step: 'COMPLETED' 
    };
  }

  async verifyOtp(email, otpCode) {
    // Kept for backward compatibility, but not used in the new flow
    throw new Error('OTP is currently disabled');
  }
}

module.exports = new AuthService();
