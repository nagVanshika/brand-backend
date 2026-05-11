const env = require('./env.config');

const STORAGE_CONFIG = {
  driver: env.FILE_STORAGE_DRIVER, // local | s3
  local: {
    uploadDir: env.UPLOAD_DIR || 'uploads'
  },
  s3: {
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY
    },
    buckets: {
      kyc: env.S3_KYC_BUCKET,
      campaign: env.S3_CAMPAIGN_BUCKET
    }
  }
};

module.exports = STORAGE_CONFIG;
