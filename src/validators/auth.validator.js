const { z } = require('zod');

const requestOtpSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address')
  })
});

const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be 6 digits')
  })
});

const refreshTokenSchema = z.object({
  body: z.object({
    refresh_token: z.string().min(1, 'Refresh token is required')
  })
});

module.exports = {
  requestOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema
};
