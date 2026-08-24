import request from 'supertest';
import { createApp } from '../src/app';
import { CategoriesService } from '../src/services/categories.service';
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

jest.mock('../src/services/categories.service');

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
  mockService = (CategoriesService as unknown as jest.Mock).mock
    .instances[0] as typeof mockService;
});

beforeEach(() => {
  jest.clearAllMocks();
});

function mockCategoryData(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Food',
    color: '#FF6B6B',
    type: 'expense',
    isFallback: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function mockCategory(overrides: Record<string, unknown> = {}) {
  const data = mockCategoryData(overrides);
  return { ...data, toJSON: () => data };
}

describe('Category Routes', () => {
  describe('GET /api/v1/categories', () => {
    it('returns 401 when authentication is missing', async () => {
      (authenticate as jest.Mock).mockImplementation((_req: any, res: any) => {
        res.status(401).json({ success: false, error: 'Authentication required' });
      });

      const app = createApp();
      const res = await request(app).get('/api/v1/categories');

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

    it('returns categories list for authenticated user', async () => {
      const categories = [mockCategory(), mockCategory({ id: 'cat-2', name: 'Salary', type: 'income' })];
      mockService.findAll.mockResolvedValue(categories);

      const app = createApp();
      const res = await request(app).get('/api/v1/categories');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: [
          mockCategoryData(),
          mockCategoryData({ id: 'cat-2', name: 'Salary', type: 'income' }),
        ],
      });
      expect(mockService.findAll).toHaveBeenCalledWith('user-1');
    });
  });

  describe('GET /api/v1/categories/:id', () => {
    it('returns a single category by id', async () => {
      mockService.findById.mockResolvedValue(mockCategory());

      const app = createApp();
      const res = await request(app).get('/api/v1/categories/cat-1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: mockCategoryData() });
      expect(mockService.findById).toHaveBeenCalledWith('cat-1', 'user-1');
    });

    it('returns 404 when category is not found', async () => {
      mockService.findById.mockRejectedValue(new NotFoundError('Category cat-1 not found'));

      const app = createApp();
      const res = await request(app).get('/api/v1/categories/cat-1');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Category cat-1 not found');
    });
  });

  describe('POST /api/v1/categories', () => {
    it('returns 400 with validation error for invalid body', async () => {
      const app = createApp();
      const res = await request(app).post('/api/v1/categories').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toBeDefined();
      expect(Array.isArray(res.body.details)).toBe(true);
    });

    it('creates a category with a valid body', async () => {
      mockService.create.mockResolvedValue(mockCategory());

      const app = createApp();
      const res = await request(app)
        .post('/api/v1/categories')
        .send({ name: 'Food', color: '#FF6B6B', type: 'expense' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ success: true, data: mockCategoryData() });
      expect(mockService.create).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ name: 'Food', color: '#FF6B6B', type: 'expense' }),
      );
    });
  });

  describe('PATCH /api/v1/categories/:id', () => {
    it('updates a category', async () => {
      mockService.update.mockResolvedValue(mockCategory({ name: 'Groceries' }));

      const app = createApp();
      const res = await request(app)
        .patch('/api/v1/categories/cat-1')
        .send({ name: 'Groceries' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: mockCategoryData({ name: 'Groceries' }),
      });
      expect(mockService.update).toHaveBeenCalledWith(
        'cat-1',
        'user-1',
        expect.objectContaining({ name: 'Groceries' }),
      );
    });

    it('returns 404 when updating a non-existent category', async () => {
      mockService.update.mockRejectedValue(new NotFoundError('Category cat-1 not found'));

      const app = createApp();
      const res = await request(app)
        .patch('/api/v1/categories/cat-1')
        .send({ name: 'Groceries' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Category cat-1 not found');
    });
  });

  describe('DELETE /api/v1/categories/:id', () => {
    it('deletes a category and returns null data', async () => {
      mockService.delete.mockResolvedValue(undefined);

      const app = createApp();
      const res = await request(app).delete('/api/v1/categories/cat-1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: null });
      expect(mockService.delete).toHaveBeenCalledWith('cat-1', 'user-1');
    });

    it('returns 404 when deleting a non-existent category', async () => {
      mockService.delete.mockRejectedValue(new NotFoundError('Category cat-1 not found'));

      const app = createApp();
      const res = await request(app).delete('/api/v1/categories/cat-1');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Category cat-1 not found');
    });
  });
});
