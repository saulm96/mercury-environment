import { z } from 'zod';

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    color: z.string().regex(hexColorRegex, 'Must be a valid hex color (#RRGGBB)').optional(),
    type: z.enum(['income', 'expense']),
  }),
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    color: z.string().regex(hexColorRegex, 'Must be a valid hex color (#RRGGBB)').optional(),
  }),
});
