import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { AuthService } from '../services/auth.service';

const router = Router();
const authService = new AuthService();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const token = authService.generateToken(user as any);
      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
      const cookieDomain = process.env.COOKIE_DOMAIN ?? 'localhost';
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        domain: cookieDomain,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.redirect(`${frontendUrl}/transactions`);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
