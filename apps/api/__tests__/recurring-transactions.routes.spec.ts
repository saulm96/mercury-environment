import request from 'supertest';
import { createApp } from '../src/app';
import { RecurringTransactionsService } from '../src/services/recurring-transactions.service';
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

jest.mock('../src/services/recurring-transactions.service');

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
  processDue: jest.Mock;
  skipDate: jest.Mock;
  unskipDate: jest.Mock;
};

beforeAll(() => {
  mockService = (RecurringTransactionsService as unknown as jest.Mock).mock
    .instances[0] as typeof mockService;
});

beforeEach(() => {
  jest.clearAllMocks();
});

function mockRecurringData(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rec-1',
    userId: 'user-1',
    categoryId: 'cat-1',
    type: 'expense',
    amount: 100,
    description: 'Test recurring',
    frequency: 'daily',
    interval: 1,
    startDate: '2024-01-01',
    endDate: null,
    nextDate: '2024-01-01',
    dayOfMonth: null,
    dayOfWeek: null,
    status: 'active',
    category: { id: 'cat-1', name: 'Food', color: '#FF6B6B', type: 'expense' },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function mockRecurring(overrides: Record<string, unknown> = {}) {
  const data = mockRecurringData(overrides);
  return { ...data, toJSON: () => data };
}

function mockSkipData(overrides: Record<string, unknown> = {}) {
  return {
    id: 'skip-1',
    recurringTransactionId: 'rec-1',
    occurrenceDate: '2024-01-02',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('Recurring Transaction Routes', () => {
  describe('GET /api/v1/recurring-transactions', () => {
    it('returns 401 when authentication is missing', async () => {
      (authenticate as jest.Mock).mockImplementation((_req: any, res: any) => {
        res.status(401).json({ success: false, error: 'Authentication required' });
      });

      const app = createApp();
      const res = await request(app).get('/api/v1/recurring-transactions');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Authentication required');

      (authenticate as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { id: 'user-1', email: 'test@test.com' };
        next();
      });
    });

    it('returns recurring transactions list for authenticated user', async () => {
      const recs = [mockRecurring(), mockRecurring({ id: 'rec-2', description: 'Other' })];
      mockService.findAll.mockResolvedValue(recs);

      const app = createApp();
      const res = await request(app).get('/api/v1/recurring-transactions');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: [mockRecurringData(), mockRecurringData({ id: 'rec-2', description: 'Other' })],
      });
      expect(mockService.findAll).toHaveBeenCalledWith('user-1');
    });
  });

  describe('GET /api/v1/recurring-transactions/:id', () => {
    it('returns a single recurring transaction by id', async () => {
      const rec = mockRecurring();
      mockService.findById.mockResolvedValue(rec);

      const app = createApp();
      const res = await request(app).get('/api/v1/recurring-transactions/rec-1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: mockRecurringData() });
      expect(mockService.findById).toHaveBeenCalledWith('rec-1', 'user-1');
    });

    it('returns 404 when recurring transaction is not found', async () => {
      mockService.findById.mockRejectedValue(new NotFoundError('Recurring transaction rec-1 not found'));

      const app = createApp();
      const res = await request(app).get('/api/v1/recurring-transactions/rec-1');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Recurring transaction rec-1 not found');
    });
  });

  describe('POST /api/v1/recurring-transactions', () => {
    it('returns 400 with validation error for invalid body', async () => {
      const app = createApp();
      const res = await request(app).post('/api/v1/recurring-transactions').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toBeDefined();
      expect(Array.isArray(res.body.details)).toBe(true);
    });

    it('creates a recurring transaction with a valid body', async () => {
      const rec = mockRecurring({ amount: 50, description: 'Coffee', frequency: 'monthly' });
      mockService.create.mockResolvedValue(rec);

      const app = createApp();
      const res = await request(app).post('/api/v1/recurring-transactions').send({
        type: 'expense',
        amount: 50,
        description: 'Coffee',
        date: '2024-01-01',
        frequency: 'monthly',
        interval: 1,
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        success: true,
        data: mockRecurringData({ amount: 50, description: 'Coffee', frequency: 'monthly' }),
      });
      expect(mockService.create).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          type: 'expense',
          amount: 50,
          description: 'Coffee',
          date: '2024-01-01',
          frequency: 'monthly',
          interval: 1,
        }),
      );
    });
  });

  describe('PATCH /api/v1/recurring-transactions/:id', () => {
    it('updates a recurring transaction', async () => {
      const updated = mockRecurring({ description: 'Updated', amount: 200 });
      mockService.update.mockResolvedValue(updated);

      const app = createApp();
      const res = await request(app)
        .patch('/api/v1/recurring-transactions/rec-1')
        .send({ description: 'Updated', amount: 200 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: mockRecurringData({ description: 'Updated', amount: 200 }),
      });
      expect(mockService.update).toHaveBeenCalledWith(
        'rec-1',
        'user-1',
        expect.objectContaining({ description: 'Updated', amount: 200 }),
      );
    });
  });

  describe('DELETE /api/v1/recurring-transactions/:id', () => {
    it('deletes a recurring transaction and returns null data', async () => {
      mockService.delete.mockResolvedValue(undefined);

      const app = createApp();
      const res = await request(app).delete('/api/v1/recurring-transactions/rec-1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: null });
      expect(mockService.delete).toHaveBeenCalledWith('rec-1', 'user-1');
    });
  });

  describe('POST /api/v1/recurring-transactions/process-due', () => {
    it('returns process result', async () => {
      mockService.processDue.mockResolvedValue({ generated: 3, errors: [] });

      const app = createApp();
      const res = await request(app).post('/api/v1/recurring-transactions/process-due');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: { generated: 3, errors: [] } });
      expect(mockService.processDue).toHaveBeenCalledWith('user-1');
    });
  });

  describe('POST /api/v1/recurring-transactions/:id/skip', () => {
    it('returns 400 for invalid body', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/recurring-transactions/rec-1/skip')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
    });

    it('creates a skip for the recurring transaction', async () => {
      const skip = { ...mockSkipData(), toJSON: () => mockSkipData() };
      mockService.skipDate.mockResolvedValue(skip);

      const app = createApp();
      const res = await request(app)
        .post('/api/v1/recurring-transactions/rec-1/skip')
        .send({ occurrenceDate: '2024-01-02' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ success: true, data: mockSkipData() });
      expect(mockService.skipDate).toHaveBeenCalledWith('rec-1', 'user-1', '2024-01-02');
    });
  });

  describe('DELETE /api/v1/recurring-transactions/:id/skip', () => {
    it('removes a skip by occurrenceDate query param', async () => {
      mockService.unskipDate.mockResolvedValue(undefined);

      const app = createApp();
      const res = await request(app)
        .delete('/api/v1/recurring-transactions/rec-1/skip')
        .query({ occurrenceDate: '2024-01-02' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: null });
      expect(mockService.unskipDate).toHaveBeenCalledWith('rec-1', 'user-1', '2024-01-02');
    });
  });
});
