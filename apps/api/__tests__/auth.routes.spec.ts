import request from 'supertest';
import { createApp } from '../src/app';
import passport from 'passport';

jest.mock('passport', () => {
  const googleRedirectMiddleware = (_req: any, res: any) => {
    res.redirect('https://accounts.google.com/o/oauth2/v2/auth');
  };
  return {
    initialize: jest.fn(() => (_req: any, _res: any, next: any) => next()),
    authenticate: jest.fn().mockReturnValue(googleRedirectMiddleware),
    use: jest.fn(),
  };
});

describe('Auth Routes', () => {
  describe('GET /auth/google', () => {
    it('redirects to Google OAuth authorization endpoint', async () => {
      const app = createApp();
      const res = await request(app).get('/auth/google');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('accounts.google.com');
    });

    it('calls passport.authenticate with google strategy and correct scopes', () => {
      expect(passport.authenticate).toHaveBeenCalledWith('google', {
        scope: ['profile', 'email'],
      });
    });
  });

  describe('POST /auth/logout', () => {
    it('clears the token cookie and returns success', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/auth/logout')
        .set('Cookie', 'token=some-existing-token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: null });

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find((c) => c.startsWith('token='));
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie).toContain('token=;');
    });

    it('returns success even when no cookie is present', async () => {
      const app = createApp();
      const res = await request(app).post('/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: null });
    });
  });
});
