import { z } from 'zod';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const createBudgetSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    value: z.number().positive().max(99999999.99),
    categoryIds: z.array(z.string().regex(uuidRegex, 'Must be a valid UUID')).min(1),
  }),
});

export const updateBudgetSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    value: z.number().positive().max(99999999.99).optional(),
    categoryIds: z.array(z.string().regex(uuidRegex, 'Must be a valid UUID')).min(1).optional(),
  }),
});
