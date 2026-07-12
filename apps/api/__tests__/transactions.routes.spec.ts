import request from 'supertest';
import { createApp } from '../src/app';
import { TransactionsService } from '../src/services/transactions.service';
import { authenticate } from '../src/middleware/auth.middleware';

jest.mock('../src/config/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../src/services/transactions.service');

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
};

beforeAll(() => {
  mockService = (TransactionsService as unknown as jest.Mock).mock
    .instances[0] as typeof mockService;
});

beforeEach(() => {
  jest.clearAllMocks();
});

function mockTxData(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tx-1',
    userId: 'user-1',
    categoryId: 'cat-1',
    type: 'expense',
    amount: 100,
    description: 'Test transaction',
    date: '2024-01-01',
    category: { id: 'cat-1', name: 'Food', color: '#FF6B6B', type: 'expense' },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function mockTx(overrides: Record<string, unknown> = {}) {
  const data = mockTxData(overrides);
  return { ...data, toJSON: () => data };
}

describe('Transaction Routes', () => {
  describe('GET /api/v1/transactions', () => {
    it('returns 401 when authentication is missing', async () => {
      (authenticate as jest.Mock).mockImplementation((_req: any, res: any) => {
        res.status(401).json({ success: false, error: 'Authentication required' });
      });

      const app = createApp();
      const res = await request(app).get('/api/v1/transactions');

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

    it('returns transactions list for authenticated user', async () => {
      const txs = [mockTx(), mockTx({ id: 'tx-2', description: 'Other' })];
      mockService.findAll.mockResolvedValue(txs);

      const app = createApp();
      const res = await request(app).get('/api/v1/transactions');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: [mockTxData(), mockTxData({ id: 'tx-2', description: 'Other' })],
      });
      expect(mockService.findAll).toHaveBeenCalledWith('user-1');
    });
  });

  describe('GET /api/v1/transactions/:id', () => {
    it('returns a single transaction by id', async () => {
      const tx = mockTx();
      mockService.findById.mockResolvedValue(tx);

      const app = createApp();
      const res = await request(app).get('/api/v1/transactions/tx-1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: mockTxData() });
      expect(mockService.findById).toHaveBeenCalledWith('tx-1', 'user-1');
    });
  });

  describe('POST /api/v1/transactions', () => {
    it('returns 400 with validation error for invalid body', async () => {
      const app = createApp();
      const res = await request(app).post('/api/v1/transactions').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toBeDefined();
      expect(Array.isArray(res.body.details)).toBe(true);
    });

    it('creates a transaction with a valid body', async () => {
      const tx = mockTx({ amount: 50, description: 'Coffee' });
      mockService.create.mockResolvedValue(tx);

      const app = createApp();
      const res = await request(app)
        .post('/api/v1/transactions')
        .send({
          type: 'expense',
          amount: 50,
          description: 'Coffee',
          date: '2024-01-01',
          categoryId: '123e4567-e89b-12d3-a456-426614174000',
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        success: true,
        data: mockTxData({ amount: 50, description: 'Coffee' }),
      });
      expect(mockService.create).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          type: 'expense',
          amount: 50,
          description: 'Coffee',
          date: '2024-01-01',
        }),
      );
    });
  });

  describe('PATCH /api/v1/transactions/:id', () => {
    it('updates a transaction', async () => {
      const updated = mockTx({ description: 'Updated', amount: 200 });
      mockService.update.mockResolvedValue(updated);

      const app = createApp();
      const res = await request(app)
        .patch('/api/v1/transactions/tx-1')
        .send({ description: 'Updated', amount: 200 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: mockTxData({ description: 'Updated', amount: 200 }),
      });
      expect(mockService.update).toHaveBeenCalledWith(
        'tx-1',
        'user-1',
        expect.objectContaining({ description: 'Updated', amount: 200 }),
      );
    });
  });

  describe('DELETE /api/v1/transactions/:id', () => {
    it('deletes a transaction and returns null data', async () => {
      mockService.delete.mockResolvedValue(undefined);

      const app = createApp();
      const res = await request(app).delete('/api/v1/transactions/tx-1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: null });
      expect(mockService.delete).toHaveBeenCalledWith('tx-1', 'user-1');
    });
  });
});
