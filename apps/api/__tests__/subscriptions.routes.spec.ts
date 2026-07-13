import request from 'supertest';
import { createApp } from '../src/app';
import { SubscriptionsService } from '../src/services/subscription.service';
import { authenticate } from '../src/middleware/auth.middleware';
import { NotFoundError, ForbiddenError } from '../src/middleware/error.middleware';

jest.mock('../src/config/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../src/services/subscription.service');

jest.mock('../src/middleware/auth.middleware', () => ({
  authenticate: jest.fn((req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', email: 'test@test.com' };
    next();
  }),
}));

let mockService: {
  findAll: jest.Mock;
  findById: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  getStats: jest.Mock;
  getByServiceType: jest.Mock;
  getUpcomingRenewals: jest.Mock;
};

beforeAll(() => {
  mockService = (SubscriptionsService as unknown as jest.Mock).mock
    .instances[0] as typeof mockService;
});

beforeEach(() => {
  jest.clearAllMocks();
});

function mockSubscriptionData(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub-1',
    userId: 'user-1',
    recurringTransactionId: 'rec-1',
    serviceType: 'streaming',
    recurringTransaction: {
      id: 'rec-1',
      userId: 'user-1',
      categoryId: null,
      type: 'expense',
      amount: 12,
      description: 'Netflix',
      frequency: 'monthly',
      interval: 1,
      startDate: '2024-01-01',
      endDate: null,
      nextDate: '2099-01-15',
      dayOfMonth: null,
      dayOfWeek: null,
      status: 'active',
      category: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function mockSubscription(overrides: Record<string, unknown> = {}) {
  const data = mockSubscriptionData(overrides);
  return { ...data, toJSON: () => data };
}

describe('Subscription Routes', () => {
  describe('GET /api/v1/subscriptions', () => {
    it('returns 401 when authentication is missing', async () => {
      (authenticate as jest.Mock).mockImplementation((_req: any, res: any) => {
        res.status(401).json({ success: false, error: 'Authentication required' });
      });

      const app = createApp();
      const res = await request(app).get('/api/v1/subscriptions');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Authentication required');

      (authenticate as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { id: 'user-1', email: 'test@test.com' };
        next();
      });
    });

    it('returns subscriptions list for authenticated user', async () => {
      const subs = [mockSubscription(), mockSubscription({ id: 'sub-2', serviceType: 'ai' })];
      mockService.findAll.mockResolvedValue(subs);

      const app = createApp();
      const res = await request(app).get('/api/v1/subscriptions');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: [mockSubscriptionData(), mockSubscriptionData({ id: 'sub-2', serviceType: 'ai' })],
      });
      expect(mockService.findAll).toHaveBeenCalledWith('user-1');
    });
  });

  describe('GET /api/v1/subscriptions/:id', () => {
    it('returns a single subscription by id', async () => {
      const sub = mockSubscription();
      mockService.findById.mockResolvedValue(sub);

      const app = createApp();
      const res = await request(app).get('/api/v1/subscriptions/sub-1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: mockSubscriptionData() });
      expect(mockService.findById).toHaveBeenCalledWith('sub-1', 'user-1');
    });

    it('returns 404 when subscription is not found', async () => {
      mockService.findById.mockRejectedValue(new NotFoundError('Subscription sub-1 not found'));

      const app = createApp();
      const res = await request(app).get('/api/v1/subscriptions/sub-1');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Subscription sub-1 not found');
    });
  });

  describe('POST /api/v1/subscriptions', () => {
    it('returns 400 with validation error for invalid body', async () => {
      const app = createApp();
      const res = await request(app).post('/api/v1/subscriptions').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toBeDefined();
      expect(Array.isArray(res.body.details)).toBe(true);
    });

    it('creates a subscription with a valid body', async () => {
      const sub = mockSubscription({
        recurringTransactionId: '123e4567-e89b-12d3-a456-426614174000',
        serviceType: 'ai',
      });
      mockService.create.mockResolvedValue(sub);

      const app = createApp();
      const res = await request(app).post('/api/v1/subscriptions').send({
        recurringTransactionId: '123e4567-e89b-12d3-a456-426614174000',
        serviceType: 'ai',
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        success: true,
        data: mockSubscriptionData({
          recurringTransactionId: '123e4567-e89b-12d3-a456-426614174000',
          serviceType: 'ai',
        }),
      });
      expect(mockService.create).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          recurringTransactionId: '123e4567-e89b-12d3-a456-426614174000',
          serviceType: 'ai',
        }),
      );
    });

    it('returns 403 when recurring transaction already has a subscription', async () => {
      mockService.create.mockRejectedValue(
        new ForbiddenError('Subscription already exists for this recurring transaction'),
      );

      const app = createApp();
      const res = await request(app).post('/api/v1/subscriptions').send({
        recurringTransactionId: '123e4567-e89b-12d3-a456-426614174000',
        serviceType: 'streaming',
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Subscription already exists for this recurring transaction');
    });
  });

  describe('PATCH /api/v1/subscriptions/:id', () => {
    it('returns 400 with validation error for invalid body', async () => {
      const app = createApp();
      const res = await request(app).patch('/api/v1/subscriptions/sub-1').send({
        serviceType: 'invalid',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
    });

    it('updates a subscription', async () => {
      const updated = mockSubscription({ serviceType: 'productivity' });
      mockService.update.mockResolvedValue(updated);

      const app = createApp();
      const res = await request(app).patch('/api/v1/subscriptions/sub-1').send({
        serviceType: 'productivity',
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: mockSubscriptionData({ serviceType: 'productivity' }),
      });
      expect(mockService.update).toHaveBeenCalledWith(
        'sub-1',
        'user-1',
        expect.objectContaining({ serviceType: 'productivity' }),
      );
    });
  });

  describe('DELETE /api/v1/subscriptions/:id', () => {
    it('deletes a subscription and returns null data', async () => {
      mockService.delete.mockResolvedValue(undefined);

      const app = createApp();
      const res = await request(app).delete('/api/v1/subscriptions/sub-1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: null });
      expect(mockService.delete).toHaveBeenCalledWith('sub-1', 'user-1');
    });
  });

  describe('GET /api/v1/subscriptions/stats', () => {
    it('returns subscription summary statistics', async () => {
      const stats = {
        monthlyTotal: 42,
        yearlyTotal: 504,
        activeCount: 3,
        nextRenewal: { description: 'Netflix', date: '2099-01-15', daysUntil: 100 },
      };
      mockService.getStats.mockResolvedValue(stats);

      const app = createApp();
      const res = await request(app)
        .get('/api/v1/subscriptions/stats')
        .query({ year: '2099', month: '1' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: stats });
      expect(mockService.getStats).toHaveBeenCalledWith('user-1', 2099, 1);
    });
  });

  describe('GET /api/v1/subscriptions/service-types', () => {
    it('returns cost grouped by service type', async () => {
      const stats = [
        { serviceType: 'streaming', monthlyTotal: 36, count: 2 },
        { serviceType: 'ai', monthlyTotal: 10, count: 1 },
      ];
      mockService.getByServiceType.mockResolvedValue(stats);

      const app = createApp();
      const res = await request(app).get('/api/v1/subscriptions/service-types');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: stats });
      expect(mockService.getByServiceType).toHaveBeenCalledWith('user-1');
    });
  });

  describe('GET /api/v1/subscriptions/upcoming', () => {
    it('returns upcoming renewals for the date range', async () => {
      const subs = [mockSubscription(), mockSubscription({ id: 'sub-2' })];
      mockService.getUpcomingRenewals.mockResolvedValue(subs);

      const app = createApp();
      const res = await request(app)
        .get('/api/v1/subscriptions/upcoming')
        .query({ from: '2099-01-01', to: '2099-01-31' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: [mockSubscriptionData(), mockSubscriptionData({ id: 'sub-2' })],
      });
      expect(mockService.getUpcomingRenewals).toHaveBeenCalledWith(
        'user-1',
        '2099-01-01',
        '2099-01-31',
      );
    });
  });
});
