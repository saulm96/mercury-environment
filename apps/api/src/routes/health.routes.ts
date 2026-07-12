import { Router, Request, Response } from 'express';
import { sequelize } from '../config/database';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  let database: string;
  let status: string;

  try {
    await sequelize.authenticate();
    database = 'connected';
    status = 'ok';
  } catch {
    database = 'disconnected';
    status = 'degraded';
  }

  res.json({ status, timestamp, database });
});

export default router;
