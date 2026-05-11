const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const STORAGE_CONFIG = require('../config/storage.config');
const AppError = require('../utils/AppError');
const pino = require('pino')();

class StorageService {
  constructor() {
    this.driver = STORAGE_CONFIG.driver;
    if (this.driver === 'local') {
      this._ensureDirExists(STORAGE_CONFIG.local.uploadDir);
    }
  }

  /**
   * Upload file
   * @param {Object} file - Multer file object
   * @param {string} module - 'kyc' | 'campaign'
   * @param {string} userId 
   */
  async upload(file, module, userId) {
    const filename = `${uuidv4()}${path.extname(file.originalname)}`;
    const relativePath = path.join(module, userId, filename);

    if (this.driver === 'local') {
      return this._uploadLocal(file, relativePath);
    } else {
      return this._uploadS3(file, relativePath, module);
    }
  }

  /**
   * Get Access URL for a file key/path
   */
  async getAccessUrl(key, module) {
    if (this.driver === 'local') {
      return `/api/v1/files/${key}`;
    } else {
      // TODO: Implement S3 signed URL
      return `https://${STORAGE_CONFIG.s3.buckets[module]}.s3.${STORAGE_CONFIG.s3.region}.amazonaws.com/${key}`;
    }
  }

  async _uploadLocal(file, relativePath) {
    const fullPath = path.join(STORAGE_CONFIG.local.uploadDir, relativePath);
    this._ensureDirExists(path.dirname(fullPath));

    return new Promise((resolve, reject) => {
      fs.writeFile(fullPath, file.buffer, (err) => {
        if (err) {
          pino.error(err, 'Local Upload Failed');
          return reject(new AppError('Failed to upload file locally', 500));
        }
        resolve(relativePath.replace(/\\/g, '/'));
      });
    });
  }

  async _uploadS3(file, relativePath, module) {
    // TODO: Implement AWS SDK s3.putObject
    pino.warn('S3 Upload not fully implemented. Falling back to local log.');
    return relativePath.replace(/\\/g, '/');
  }

  _ensureDirExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

module.exports = new StorageService();
