const mongoose = require('mongoose');
const env = require('./env.config');
const pino = require('pino')();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI);
    pino.info(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    pino.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
