const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_SECONDS: 300, // 5 minutes
  RESEND_THROTTLE_SECONDS: 60,
  MAX_ATTEMPTS: 3
};

const USER_ROLES = {
  ADMIN: 'admin',
  CAMPAIGN_MANAGER: 'campaign_manager',
  VIEWER: 'viewer'
};

const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh'
};

module.exports = {
  OTP_CONFIG,
  USER_ROLES,
  TOKEN_TYPES
};
