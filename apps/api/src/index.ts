import dotenv from 'dotenv';
dotenv.config();

import 'reflect-metadata';
import { createApp } from './app';
import { sequelize } from './config/database';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('Database models synced.');
    }

    const app = createApp();
    app.listen(PORT, () => {
      console.log(`API server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start API server:', error);
    process.exit(1);
  }
}

main();
