import dotenv from 'dotenv';
dotenv.config();

import 'reflect-metadata';
import { createApp } from './app';
import { sequelize } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';

async function main() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established.');

    if (env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database models synced.');
    }

    const app = createApp();
    app.listen(env.PORT, () => {
      logger.info(`API server listening on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error(error, 'Failed to start API server');
    process.exit(1);
  }
}

main();
