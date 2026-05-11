const Redis = require('ioredis');
const env = require('./env.config');
const pino = require('pino')();

let redis = null;

if (env.REDIS_URL) {
  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });

  redis.on('connect', () => {
    pino.info('✅ Redis Connected');
  });

  redis.on('error', (err) => {
    pino.error(`❌ Redis Error: ${err.message}`);
  });
} else {
  pino.warn('⚠️ REDIS_URL not provided. Redis-based features (OTP, Cache) will be disabled.');
}

module.exports = redis;
