import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { AuthService } from '../services/auth.service';
import { env } from '../config/env';

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
      res.cookie('token', token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        domain: env.COOKIE_DOMAIN,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.redirect(`${env.FRONTEND_URL}/transactions`);
    } catch (err) {
      next(err);
    }
  }
);

router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN,
  });
  res.json({ success: true, data: null });
});

export default router;
