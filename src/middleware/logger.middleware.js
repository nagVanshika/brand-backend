const { v4: uuidv4 } = require('uuid');
const pino = require('pino')();

/**
 * Middleware for structured logging of every request
 */
const loggerMiddleware = (req, res, next) => {
  const traceId = req.headers['x-trace-id'] || uuidv4();
  req.traceId = traceId;
  req.startTime = process.hrtime();

  res.setHeader('X-Trace-ID', traceId);

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(req.startTime);
    const durationMs = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);

    const logData = {
      traceId: req.traceId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: `${durationMs}ms`,
      ip: req.ip,
      userId: req.user?.id || req.user?._id || null
    };

    if (res.statusCode >= 500) {
      pino.error(logData, 'Request Failed (Server Error)');
    } else if (res.statusCode >= 400) {
      pino.warn(logData, 'Request Warning (Client Error)');
    } else {
      pino.info(logData, 'Request Success');
    }
  });

  next();
};

module.exports = loggerMiddleware;
