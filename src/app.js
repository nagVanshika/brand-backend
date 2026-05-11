const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const env = require('./config/env.config');
const loggerMiddleware = require('./middleware/logger.middleware');
const errorHandler = require('./middleware/errorHandler.middleware');
const v1Routes = require('./routes/v1');

const app = express();

// 1. Security Headers
app.use(helmet());

// 2. Mongo Sanitization (brute force protection against $ in queries)
app.use(mongoSanitize());

// 3. CORS
app.use(cors({
  origin: env.ALLOWED_ORIGINS === '*' ? '*' : env.ALLOWED_ORIGINS.split(','),
  credentials: true
}));

// 4. Compression (Responses > 1KB)
app.use(compression({
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// 5. Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 6. Trace ID & Logger
app.use(loggerMiddleware);

// 7. Routes
app.use('/api/v1', v1Routes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Brand Backend is healthy',
    data: {
      timestamp: new Date(),
      env: env.NODE_ENV
    }
  });
});

// 8. Global Error Handler
app.use(errorHandler);

module.exports = app;
