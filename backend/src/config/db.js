const mongoose = require('mongoose');
const { config } = require('./env');
const logger = require('../utils/logger');

/**
 * Database connection.
 * NOTE: The previous in-memory fallback was REMOVED deliberately — silently
 * switching to an empty throwaway DB made real data appear to vanish.
 * Connection failures are now loud and exit the process.
 */ 
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    logger.error('MongoDB connection FAILED', { uri: config.mongoUri, error: error.message });
    logger.error('Check that MongoDB is running and MONGODB_URI is correct in backend/.env');
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
};

module.exports = { connectDB, disconnectDB };
