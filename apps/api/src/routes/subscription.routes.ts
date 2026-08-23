import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../utils/async-handler';
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
} from '../schemas/subscription.schema';
import { SubscriptionsService } from '../services/subscription.service';

const router = Router();
const subscriptionsService = new SubscriptionsService();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const subscriptions = await subscriptionsService.findAll(req.user!.id);
    res.json({ success: true, data: subscriptions.map((s) => s.toJSON()) });
  }),
);

router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const year = parseInt(req.query.year as string, 10);
    const month = parseInt(req.query.month as string, 10);
    const stats = await subscriptionsService.getStats(req.user!.id, year, month);
    res.json({ success: true, data: stats });
  }),
);

router.get(
  '/service-types',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await subscriptionsService.getByServiceType(req.user!.id);
    res.json({ success: true, data: stats });
  }),
);

router.get(
  '/upcoming',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const from = req.query.from as string;
    const to = req.query.to as string;
    const subscriptions = await subscriptionsService.getUpcomingRenewals(
      req.user!.id,
      from,
      to,
    );
    res.json({ success: true, data: subscriptions.map((s) => s.toJSON()) });
  }),
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const subscription = await subscriptionsService.findById(
      req.params.id,
      req.user!.id,
    );
    res.json({ success: true, data: subscription.toJSON() });
  }),
);

router.post(
  '/',
  authenticate,
  validate(createSubscriptionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const subscription = await subscriptionsService.create(req.user!.id, req.body);
    res.status(201).json({ success: true, data: subscription.toJSON() });
  }),
);

router.patch(
  '/:id',
  authenticate,
  validate(updateSubscriptionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const subscription = await subscriptionsService.update(
      req.params.id,
      req.user!.id,
      req.body,
    );
    res.json({ success: true, data: subscription.toJSON() });
  }),
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await subscriptionsService.delete(req.params.id, req.user!.id);
    res.json({ success: true, data: null });
  }),
);

export default router;
