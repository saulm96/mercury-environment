import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createTransactionSchema, updateTransactionSchema } from '../schemas/transaction.schema';
import { TransactionsService } from '../services/transactions.service';

const router = Router();
const transactionsService = new TransactionsService();

router.get('/', authenticate, async (req: Request, res: Response) => {
  const transactions = await transactionsService.findAll(req.user!.id);
  res.json({ success: true, data: transactions.map((t) => t.toJSON()) });
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const transaction = await transactionsService.findById(req.params.id as string, req.user!.id);
  res.json({ success: true, data: transaction.toJSON() });
});

router.post('/', authenticate, validate(createTransactionSchema), async (req: Request, res: Response) => {
  const transaction = await transactionsService.create(req.user!.id, req.body);
  res.status(201).json({ success: true, data: transaction.toJSON() });
});

router.patch('/:id', authenticate, validate(updateTransactionSchema), async (req: Request, res: Response) => {
  const transaction = await transactionsService.update(req.params.id as string, req.user!.id, req.body);
  res.json({ success: true, data: transaction.toJSON() });
});

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  await transactionsService.delete(req.params.id as string, req.user!.id);
  res.json({ success: true, data: null });
});

export default router;
