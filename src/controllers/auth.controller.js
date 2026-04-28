const authService = require('../services/auth.service');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json({
      success: true,
      data: result,
      message: 'OTP sent to your email'
    });
  } catch (error) {
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otpCode } = req.body;
    const result = await authService.verifyOtp(email, otpCode);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Login successful'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  verifyOtp
};
