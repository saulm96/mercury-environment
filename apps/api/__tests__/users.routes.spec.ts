import request from 'supertest';
import { createApp } from '../src/app';
import { UsersService } from '../src/services/users.service';
import { authenticate } from '../src/middleware/auth.middleware';
import { NotFoundError } from '../src/middleware/error.middleware';

jest.mock('../src/config/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../src/services/users.service');

jest.mock('../src/middleware/auth.middleware', () => ({
  authenticate: jest.fn((req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', email: 'test@test.com' };
    next();
  }),
}));

let mockService: {
  findById: jest.Mock;
  findByEmail: jest.Mock;
};

beforeAll(() => {
  mockService = (UsersService as unknown as jest.Mock).mock
    .instances[0] as typeof mockService;
});

beforeEach(() => {
  jest.clearAllMocks();
});

function mockUserData(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'test@test.com',
    name: 'Test User',
    googleId: 'google-1',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('User Routes', () => {
  describe('GET /api/v1/users/me', () => {
    it('returns 401 when authentication is missing', async () => {
      (authenticate as jest.Mock).mockImplementation((_req: any, res: any) => {
        res.status(401).json({ success: false, error: 'Authentication required' });
      });

      const app = createApp();
      const res = await request(app).get('/api/v1/users/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Authentication required');

      (authenticate as jest.Mock).mockImplementation(
        (req: any, _res: any, next: any) => {
          req.user = { id: 'user-1', email: 'test@test.com' };
          next();
        },
      );
    });

    it('returns the authenticated user', async () => {
      const data = mockUserData();
      mockService.findById.mockResolvedValue({ ...data, toJSON: () => data });

      const app = createApp();
      const res = await request(app).get('/api/v1/users/me');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: mockUserData() });
      expect(mockService.findById).toHaveBeenCalledWith('user-1');
    });

    it('returns 404 when the user no longer exists', async () => {
      mockService.findById.mockRejectedValue(new NotFoundError('User user-1 not found'));

      const app = createApp();
      const res = await request(app).get('/api/v1/users/me');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('User user-1 not found');
    });
  });
});
