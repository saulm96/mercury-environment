import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../utils/async-handler';
import { createBudgetSchema, updateBudgetSchema } from '../schemas/budget.schema';
import { BudgetsService } from '../services/budgets.service';

const router = Router();
const budgetsService = new BudgetsService();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const budgets = await budgetsService.findAll(req.user!.id);
    res.json({ success: true, data: budgets.map((b) => b.toJSON()) });
  }),
);

router.post(
  '/',
  authenticate,
  validate(createBudgetSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const budget = await budgetsService.create(req.user!.id, req.body);
    res.status(201).json({ success: true, data: budget.toJSON() });
  }),
);

router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const year = parseInt(req.query.year as string, 10);
    const month = parseInt(req.query.month as string, 10);
    const stats = await budgetsService.getStats(req.user!.id, year, month);
    res.json({ success: true, data: stats });
  }),
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const budget = await budgetsService.findById(req.params.id, req.user!.id);
    res.json({ success: true, data: budget.toJSON() });
  }),
);

router.patch(
  '/:id',
  authenticate,
  validate(updateBudgetSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const budget = await budgetsService.update(req.params.id, req.user!.id, req.body);
    res.json({ success: true, data: budget.toJSON() });
  }),
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await budgetsService.delete(req.params.id, req.user!.id);
    res.json({ success: true, data: null });
  }),
);

export default router;
