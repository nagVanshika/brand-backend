const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  const statusCode = err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: err.code || (statusCode === 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
    message: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
