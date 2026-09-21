const dotenv = require('dotenv');
dotenv.config();

// Validate environment BEFORE anything else — fail fast on missing secrets
const { validateEnv } = require('./config/env');
validateEnv();

const app = require('./app');
const { connectDB } = require('./config/db');

const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// Start Server after connecting to Database
const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.info('AXI Collection Backend API Started', {
      port: PORT,
      mode: process.env.NODE_ENV || 'development',
      health: `http://localhost:${PORT}/api/health`
    });
  });

  // Handle Unhandled Rejections
  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection Error', { error: err.message, stack: err.stack });
  });
};

startServer();
