import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { AuthService } from './services/auth.service';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import transactionsRoutes from './routes/transactions.routes';
import categoriesRoutes from './routes/categories.routes';
import { errorHandler } from './middleware/error.middleware';

const authService = new AuthService();

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3001/auth/google/callback',
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

  app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(passport.initialize());

  app.use('/health', healthRoutes);
  app.use('/auth', authRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/transactions', transactionsRoutes);
  app.use('/api/v1/categories', categoriesRoutes);

  app.use(errorHandler);

  return app;
}
