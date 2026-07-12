import { z } from 'zod';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createRecurringTransactionSchema = z.object({
  body: z.object({
    type: z.enum(['income', 'expense']),
    amount: z.number().positive().max(99999999.99),
    description: z.string().min(1).max(255),
    date: z.string().regex(dateRegex, 'Must be YYYY-MM-DD'),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().int().min(1).default(1),
    endDate: z.string().regex(dateRegex, 'Must be YYYY-MM-DD').optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    dayOfWeek: z.number().int().min(1).max(7).optional(),
    categoryId: z.string().regex(uuidRegex, 'Must be a valid UUID').optional(),
  }),
});

export const updateRecurringTransactionSchema = z.object({
  body: z.object({
    type: z.enum(['income', 'expense']).optional(),
    amount: z.number().positive().max(99999999.99).optional(),
    description: z.string().min(1).max(255).optional(),
    date: z.string().regex(dateRegex, 'Must be YYYY-MM-DD').optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
    interval: z.number().int().min(1).optional(),
    endDate: z.string().regex(dateRegex, 'Must be YYYY-MM-DD').optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    dayOfWeek: z.number().int().min(1).max(7).optional(),
    categoryId: z.string().regex(uuidRegex, 'Must be a valid UUID').optional(),
  }),
});

export const skipRecurringTransactionSchema = z.object({
  body: z.object({
    occurrenceDate: z.string().regex(dateRegex, 'Must be YYYY-MM-DD'),
  }),
});
