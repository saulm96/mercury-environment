import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../utils/async-handler';
import { createCategorySchema, updateCategorySchema } from '../schemas/category.schema';
import { CategoriesService } from '../services/categories.service';

const router = Router();
const categoriesService = new CategoriesService();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const categories = await categoriesService.findAll(req.user!.id);
    res.json({ success: true, data: categories.map((c) => c.toJSON()) });
  }),
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const category = await categoriesService.findById(req.params.id, req.user!.id);
    res.json({ success: true, data: category.toJSON() });
  }),
);

router.post(
  '/',
  authenticate,
  validate(createCategorySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const category = await categoriesService.create(req.user!.id, req.body);
    res.status(201).json({ success: true, data: category.toJSON() });
  }),
);

router.patch(
  '/:id',
  authenticate,
  validate(updateCategorySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const category = await categoriesService.update(req.params.id, req.user!.id, req.body);
    res.json({ success: true, data: category.toJSON() });
  }),
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await categoriesService.delete(req.params.id, req.user!.id);
    res.json({ success: true, data: null });
  }),
);

export default router;
