const authService = require('../../services/auth.service');
const { sendSuccess } = require('../../utils/response.util');

/**
 * Auth Controller
 */
class AuthController {
  async requestOtp(req, res, next) {
    try {
      const result = await authService.requestOtp(req.body.email);
      sendSuccess(res, result, 'OTP sent successfully');
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(req, res, next) {
    try {
      const { email, otp } = req.body;
      const result = await authService.verifyOtp(email, otp);
      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refresh_token } = req.body;
      const result = await authService.refreshAccessToken(refresh_token);
      sendSuccess(res, result, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
