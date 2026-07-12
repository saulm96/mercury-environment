import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1).default('mercury'),
  DB_USER: z.string().min(1).default('mercury'),
  DB_PASSWORD: z.string().default(''),
  JWT_SECRET: z.string().default(''),
  JWT_EXPIRES_IN: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:3001/auth/google/callback'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  COOKIE_DOMAIN: z.string().default('localhost'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

if (!data.JWT_SECRET) {
  if (data.NODE_ENV === 'production') {
    console.error('JWT_SECRET is required in production');
    process.exit(1);
  }
  console.warn('WARNING: JWT_SECRET not set. Using insecure default for development.');
  data.JWT_SECRET = 'dev-secret';
}

export const env = data;
