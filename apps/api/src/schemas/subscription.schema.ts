import { z } from 'zod';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const createSubscriptionSchema = z.object({
  body: z.object({
    recurringTransactionId: z.string().regex(uuidRegex, 'Must be a valid UUID'),
    serviceType: z.enum([
      'streaming',
      'ai',
      'cloud',
      'productivity',
      'music',
      'gaming',
      'other',
    ]),
  }),
});

export const updateSubscriptionSchema = z.object({
  body: z.object({
    serviceType: z
      .enum(['streaming', 'ai', 'cloud', 'productivity', 'music', 'gaming', 'other'])
      .optional(),
  }),
});
