const multer = require('multer');
const AppError = require('../utils/AppError');

// Use memory storage so we can decide what to do with the buffer in storageService
const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('File type not supported', 400), false);
    }
  }
});

/**
 * Storage Middleware factory
 * @param {Object} options - { module: string, field: string, maxCount: number }
 */
const storageMiddleware = ({ module, field, maxCount = 1 }) => {
  if (maxCount === 1) {
    return upload.single(field);
  }
  return upload.array(field, maxCount);
};

module.exports = storageMiddleware;
