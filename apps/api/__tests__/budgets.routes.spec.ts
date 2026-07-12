import request from 'supertest';
import { createApp } from '../src/app';
import { BudgetsService } from '../src/services/budgets.service';
import { authenticate } from '../src/middleware/auth.middleware';

jest.mock('../src/config/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../src/services/budgets.service');

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
};

beforeAll(() => {
  mockService = (BudgetsService as unknown as jest.Mock).mock
    .instances[0] as typeof mockService;
});

beforeEach(() => {
  jest.clearAllMocks();
});

function mockBudgetData(overrides: Record<string, unknown> = {}) {
  return {
    id: 'budget-1',
    userId: 'user-1',
    name: 'Essentials',
    value: 50,
    period: 'monthly',
    categories: [{ id: 'cat-1', name: 'Food', color: '#FF6B6B', type: 'expense', isFallback: false, userId: 'user-1' }],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function mockBudget(overrides: Record<string, unknown> = {}) {
  const data = mockBudgetData(overrides);
  return { ...data, toJSON: () => data };
}

function mockStatsData() {
  return {
    period: { year: 2026, month: 7 },
    totalIncome: 5000,
    totalExpenses: 2500,
    totalAllocated: 3500,
    estimatedSavings: 1500,
    actualSavings: 2500,
      budgets: [
        {
          id: 'budget-1',
          name: 'Essentials',
          value: 50,
          allocated: 2500,
          spent: 2000,
          remaining: 500,
          progress: 80,
          status: 'warning',
          categories: [],
        },
      ],
  };
}

describe('Budget Routes', () => {
  describe('GET /api/v1/budgets', () => {
    it('returns 401 when authentication is missing', async () => {
      (authenticate as jest.Mock).mockImplementation((_req: any, res: any) => {
        res.status(401).json({ success: false, error: 'Authentication required' });
      });

      const app = createApp();
      const res = await request(app).get('/api/v1/budgets');

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

    it('returns budgets list for authenticated user', async () => {
      const budgets = [mockBudget(), mockBudget({ id: 'budget-2', name: 'Leisure' })];
      mockService.findAll.mockResolvedValue(budgets);

      const app = createApp();
      const res = await request(app).get('/api/v1/budgets');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: [mockBudgetData(), mockBudgetData({ id: 'budget-2', name: 'Leisure' })],
      });
      expect(mockService.findAll).toHaveBeenCalledWith('user-1');
    });
  });

  describe('POST /api/v1/budgets', () => {
    it('returns 400 with validation error for invalid body', async () => {
      const app = createApp();
      const res = await request(app).post('/api/v1/budgets').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toBeDefined();
      expect(Array.isArray(res.body.details)).toBe(true);
    });

    it('returns 400 for empty categoryIds', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/budgets')
        .send({
          name: 'Test',
          value: 50,
          categoryIds: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('creates budget with valid body', async () => {
      const created = mockBudget({ name: 'Test Budget', value: 1000 });
      mockService.create.mockResolvedValue(created);

      const app = createApp();
      const res = await request(app)
        .post('/api/v1/budgets')
        .send({
          name: 'Test Budget',
          value: 1000,
          categoryIds: ['123e4567-e89b-12d3-a456-426614174000'],
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        success: true,
        data: mockBudgetData({ name: 'Test Budget', value: 1000 }),
      });
      expect(mockService.create).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          name: 'Test Budget',
          value: 1000,
          categoryIds: ['123e4567-e89b-12d3-a456-426614174000'],
        }),
      );
    });
  });

  describe('GET /api/v1/budgets/stats', () => {
    it('returns computed stats', async () => {
      const stats = mockStatsData();
      mockService.getStats.mockResolvedValue(stats);

      const app = createApp();
      const res = await request(app).get('/api/v1/budgets/stats?year=2026&month=7');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: stats,
      });
      expect(mockService.getStats).toHaveBeenCalledWith('user-1', 2026, 7);
    });
  });

  describe('GET /api/v1/budgets/:id', () => {
    it('returns a single budget by id', async () => {
      const budget = mockBudget();
      mockService.findById.mockResolvedValue(budget);

      const app = createApp();
      const res = await request(app).get('/api/v1/budgets/budget-1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: mockBudgetData() });
      expect(mockService.findById).toHaveBeenCalledWith('budget-1', 'user-1');
    });
  });

  describe('PATCH /api/v1/budgets/:id', () => {
    it('updates a budget', async () => {
      const updated = mockBudget({ name: 'Updated', value: 75 });
      mockService.update.mockResolvedValue(updated);

      const app = createApp();
      const res = await request(app)
        .patch('/api/v1/budgets/budget-1')
        .send({ name: 'Updated', value: 75 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: mockBudgetData({ name: 'Updated', value: 75 }),
      });
      expect(mockService.update).toHaveBeenCalledWith(
        'budget-1',
        'user-1',
        expect.objectContaining({ name: 'Updated', value: 75 }),
      );
    });
  });

  describe('DELETE /api/v1/budgets/:id', () => {
    it('deletes a budget and returns null data', async () => {
      mockService.delete.mockResolvedValue(undefined);

      const app = createApp();
      const res = await request(app).delete('/api/v1/budgets/budget-1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: null });
      expect(mockService.delete).toHaveBeenCalledWith('budget-1', 'user-1');
    });
  });
});
