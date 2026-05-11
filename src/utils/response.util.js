/**
 * Standard Response Utilities
 */

/**
 * Send success response
 * @param {Response} res 
 * @param {any} data 
 * @param {string} message 
 * @param {number} statusCode 
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Send error response
 * @param {Response} res 
 * @param {string} errorCode 
 * @param {string} message 
 * @param {number} statusCode 
 * @param {string} traceId 
 */
const sendError = (res, errorCode, message, statusCode = 400, traceId = null) => {
  return res.status(statusCode).json({
    success: false,
    error: errorCode,
    message,
    traceId
  });
};

module.exports = {
  sendSuccess,
  sendError
};
