import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    name: z.string().max(255).optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().max(255).optional(),
  }),
});
