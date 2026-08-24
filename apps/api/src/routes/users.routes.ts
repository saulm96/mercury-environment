import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/async-handler';
import { UsersService } from '../services/users.service';

const router = Router();
const usersService = new UsersService();

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await usersService.findById(req.user!.id);
    res.json({ success: true, data: user.toJSON() });
  }),
);

export default router;
