const { sendError } = require('../utils/response.util');

/**
 * Zod validation middleware factory
 * @param {import('zod').ZodSchema} schema 
 */
const validateRequest = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    next();
  } catch (error) {
    const message = error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
    
    return sendError(res, 'VALIDATION_ERROR', message, 400, req.traceId);
  }
};

module.exports = validateRequest;
