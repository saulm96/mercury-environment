import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { AuthService } from './services/auth.service';
import { env } from './config/env';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import transactionsRoutes from './routes/transactions.routes';
import categoriesRoutes from './routes/categories.routes';
import budgetsRoutes from './routes/budgets.routes';
import { errorHandler } from './middleware/error.middleware';

const authService = new AuthService();

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await authService.findOrCreateGoogleUser(profile);
          done(null, user.toJSON());
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(passport.initialize());

  if (env.NODE_ENV === 'production') {
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Too many requests, please try again later.' },
    });

    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Too many auth attempts, please try again later.' },
    });

    app.use('/health', healthRoutes);
    app.use('/auth', authLimiter, authRoutes);
    app.use('/api/v1', apiLimiter);
    app.use('/api/v1/users', usersRoutes);
    app.use('/api/v1/transactions', transactionsRoutes);
    app.use('/api/v1/categories', categoriesRoutes);
    app.use('/api/v1/budgets', budgetsRoutes);
  } else {
    app.use('/health', healthRoutes);
    app.use('/auth', authRoutes);
    app.use('/api/v1/users', usersRoutes);
    app.use('/api/v1/transactions', transactionsRoutes);
    app.use('/api/v1/categories', categoriesRoutes);
    app.use('/api/v1/budgets', budgetsRoutes);
  }

  app.use(errorHandler);

  return app;
}
