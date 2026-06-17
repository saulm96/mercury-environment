import { Sequelize } from 'sequelize-typescript';
import path from 'path';

export const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  database: process.env.DB_NAME ?? 'mercury',
  username: process.env.DB_USER ?? 'mercury',
  password: process.env.DB_PASSWORD ?? '',
  models: [path.join(__dirname, '..', 'models')],
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});
