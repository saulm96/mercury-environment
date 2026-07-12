import { z } from 'zod';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const createBudgetSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    type: z.enum(['percentage', 'fixed']),
    value: z.number().positive(),
    categoryIds: z.array(z.string().regex(uuidRegex, 'Must be a valid UUID')).min(1),
  }).superRefine((data, ctx) => {
    if (data.type === 'percentage' && (data.value <= 0 || data.value > 100)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Percentage value must be between 0 and 100',
        path: ['value'],
      });
    }
    if (data.type === 'fixed' && data.value > 99999999.99) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Fixed value must not exceed 99999999.99',
        path: ['value'],
      });
    }
  }),
});

export const updateBudgetSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    type: z.enum(['percentage', 'fixed']).optional(),
    value: z.number().positive().optional(),
    categoryIds: z.array(z.string().regex(uuidRegex, 'Must be a valid UUID')).min(1).optional(),
  }).superRefine((data, ctx) => {
    if (!data.type || data.value === undefined) return;
    if (data.type === 'percentage' && (data.value <= 0 || data.value > 100)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Percentage value must be between 0 and 100',
        path: ['value'],
      });
    }
    if (data.type === 'fixed' && data.value > 99999999.99) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Fixed value must not exceed 99999999.99',
        path: ['value'],
      });
    }
  }),
});
