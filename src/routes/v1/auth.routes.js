const express = require('express');
const authController = require('../../controllers/v1/auth.controller');
const validateRequest = require('../../middleware/validate.middleware');
const { requestOtpSchema, verifyOtpSchema, refreshTokenSchema } = require('../../validators/auth.validator');

const router = express.Router();

router.post(
  '/request-otp',
  validateRequest(requestOtpSchema),
  authController.requestOtp
);

router.post(
  '/verify-otp',
  validateRequest(verifyOtpSchema),
  authController.verifyOtp
);

router.post(
  '/refresh',
  validateRequest(refreshTokenSchema),
  authController.refresh
);

module.exports = router;
