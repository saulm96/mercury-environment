import { Sequelize } from 'sequelize-typescript';
import path from 'path';
import { env } from './env';
import { logger } from './logger';

export const sequelize = new Sequelize({
  dialect: 'mysql',
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  models: [path.join(__dirname, '..', 'models')],
  logging: env.NODE_ENV === 'development' ? (sql: string) => logger.debug(sql) : false,
  dialectOptions: {
    decimalNumbers: true,
  },
});
