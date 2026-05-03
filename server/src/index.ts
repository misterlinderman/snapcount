import dotenv from 'dotenv';

dotenv.config();

import { initNodeSentry } from './sentryInit';
initNodeSentry();

import { connectDatabase } from './config/database';
import { createApp } from './app';
import { logger } from './logger';

const app = createApp();
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      logger.info(
        { port: PORT, env: process.env.NODE_ENV || 'development' },
        'API listening'
      );
    });
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

void startServer();

export default app;
