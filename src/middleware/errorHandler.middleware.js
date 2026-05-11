const { sendError } = require('../utils/response.util');
const env = require('../config/env.config');
const pino = require('pino')();

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  const message = err.isOperational ? err.message : 'An unexpected error occurred';
  const traceId = req.traceId || null;

  // Log error (with stack trace for internal errors)
  if (!err.isOperational) {
    pino.error({
      traceId,
      message: err.message,
      stack: err.stack
    }, 'Unhandled Exception');
  }

  // Hide stack trace in production
  const errorDetails = env.NODE_ENV === 'development' ? {
    stack: err.stack,
    details: err.errors || null
  } : null;

  return sendError(res, errorCode, message, statusCode, traceId);
};

module.exports = errorHandler;
