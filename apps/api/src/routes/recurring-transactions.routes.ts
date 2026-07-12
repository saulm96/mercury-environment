import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createRecurringTransactionSchema,
  updateRecurringTransactionSchema,
  skipRecurringTransactionSchema,
} from '../schemas/recurring-transaction.schema';
import { RecurringTransactionsService } from '../services/recurring-transactions.service';

const router = Router();
const recurringTransactionsService = new RecurringTransactionsService();

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const asyncHandler = (fn: AsyncRouteHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const recurrings = await recurringTransactionsService.findAll(req.user!.id);
    res.json({ success: true, data: recurrings.map((r) => r.toJSON()) });
  }),
);

router.post(
  '/',
  authenticate,
  validate(createRecurringTransactionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const recurring = await recurringTransactionsService.create(req.user!.id, req.body);
    res.status(201).json({ success: true, data: recurring.toJSON() });
  }),
);

router.post(
  '/process-due',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await recurringTransactionsService.processDue(req.user!.id);
    res.json({ success: true, data: result });
  }),
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const recurring = await recurringTransactionsService.findById(req.params.id as string, req.user!.id);
    res.json({ success: true, data: recurring.toJSON() });
  }),
);

router.patch(
  '/:id',
  authenticate,
  validate(updateRecurringTransactionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const recurring = await recurringTransactionsService.update(
      req.params.id as string,
      req.user!.id,
      req.body,
    );
    res.json({ success: true, data: recurring.toJSON() });
  }),
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await recurringTransactionsService.delete(req.params.id as string, req.user!.id);
    res.json({ success: true, data: null });
  }),
);

router.post(
  '/:id/skip',
  authenticate,
  validate(skipRecurringTransactionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const skip = await recurringTransactionsService.skipDate(
      req.params.id as string,
      req.user!.id,
      req.body.occurrenceDate,
    );
    res.status(201).json({ success: true, data: skip });
  }),
);

router.delete(
  '/:id/skip',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await recurringTransactionsService.unskipDate(
      req.params.id as string,
      req.user!.id,
      req.query.occurrenceDate as string,
    );
    res.json({ success: true, data: null });
  }),
);

export default router;
