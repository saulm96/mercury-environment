import { CategoriesService } from '../src/services/categories.service';
import Category from '../src/models/category.model';
import Transaction from '../src/models/transaction.model';
import RecurringTransaction from '../src/models/recurring-transaction.model';
import { sequelize } from '../src/config/database';
import { NotFoundError, ForbiddenError } from '../src/middleware/error.middleware';

jest.mock('../src/models/category.model');
jest.mock('../src/models/transaction.model');
jest.mock('../src/models/recurring-transaction.model');
jest.mock('../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(),
  },
}));

const MockedCategory = Category as jest.Mocked<typeof Category>;
const MockedTransaction = Transaction as jest.Mocked<typeof Transaction>;
const MockedRecurringTransaction = RecurringTransaction as jest.Mocked<typeof RecurringTransaction>;
const MockedSequelize = sequelize as jest.Mocked<typeof sequelize>;

function mockCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Food',
    color: '#FF6B6B',
    type: 'expense',
    isFallback: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    update: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as Category;
}

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(() => {
    service = new CategoriesService();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns categories belonging to the user', async () => {
      const cats = [mockCategory(), mockCategory({ id: 'cat-2', name: 'Transport' })];
      (MockedCategory.findAll as jest.Mock).mockResolvedValue(cats);

      const result = await service.findAll('user-1');

      expect(result).toEqual(cats);
      expect(MockedCategory.findAll).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    });
  });

  describe('findById', () => {
    it('returns the category if found', async () => {
      const cat = mockCategory();
      (MockedCategory.findOne as jest.Mock).mockResolvedValue(cat);

      const result = await service.findById('cat-1', 'user-1');

      expect(result).toEqual(cat);
      expect(MockedCategory.findOne).toHaveBeenCalledWith({ where: { id: 'cat-1', userId: 'user-1' } });
    });

    it('throws NotFoundError if not found', async () => {
      (MockedCategory.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('cat-1', 'user-1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('creates a category for the user', async () => {
      (MockedCategory.findOne as jest.Mock).mockResolvedValue(null);
      const cat = mockCategory();
      (MockedCategory.create as jest.Mock).mockResolvedValue(cat);

      const result = await service.create('user-1', { name: 'Food', type: 'expense' });

      expect(result).toEqual(cat);
      expect(MockedCategory.create).toHaveBeenCalledWith({ name: 'Food', type: 'expense', userId: 'user-1' });
    });

    it('throws ForbiddenError on duplicate name', async () => {
      (MockedCategory.findOne as jest.Mock).mockResolvedValue(mockCategory());

      await expect(
        service.create('user-1', { name: 'Food', type: 'expense' }),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('update', () => {
    it('updates name and color', async () => {
      const cat = mockCategory();
      (MockedCategory.findOne as jest.Mock).mockResolvedValueOnce(cat);
      (MockedCategory.findOne as jest.Mock).mockResolvedValueOnce(null);

      const result = await service.update('cat-1', 'user-1', { name: 'Groceries', color: '#00FF00' });

      expect(cat.update).toHaveBeenCalledWith({ name: 'Groceries', color: '#00FF00' });
      expect(result).toEqual(cat);
    });

    it('throws ForbiddenError if new name conflicts with existing category', async () => {
      const cat = mockCategory();
      const duplicate = mockCategory({ id: 'cat-2', name: 'Transport' });
      (MockedCategory.findOne as jest.Mock).mockResolvedValueOnce(cat);
      (MockedCategory.findOne as jest.Mock).mockResolvedValueOnce(duplicate);

      await expect(
        service.update('cat-1', 'user-1', { name: 'Transport' }),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('delete', () => {
    it('throws NotFoundError if category does not exist', async () => {
      (MockedCategory.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('cat-1', 'user-1')).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError on fallback category', async () => {
      const fallback = mockCategory({ isFallback: true });
      (MockedCategory.findOne as jest.Mock).mockResolvedValue(fallback);

      await expect(service.delete('cat-1', 'user-1')).rejects.toThrow(ForbiddenError);
    });

    it('reassigns transactions then deletes category in a single transaction', async () => {
      const cat = mockCategory();
      const fallback = mockCategory({ id: 'fallback-1', name: 'Others', isFallback: true, type: 'expense' });

      (MockedCategory.findOne as jest.Mock).mockResolvedValueOnce(cat);

      (sequelize.transaction as jest.Mock).mockImplementation(
        async (fn: (t: unknown) => Promise<void>) => {
          const tx = { id: 'tx-1' };
          await fn(tx);
        },
      );

      (MockedCategory.findOne as jest.Mock).mockResolvedValueOnce(fallback);
      (MockedTransaction.update as jest.Mock).mockResolvedValue([1]);
      (MockedRecurringTransaction.update as jest.Mock).mockResolvedValue([1]);

      await service.delete('cat-1', 'user-1');

      expect(sequelize.transaction).toHaveBeenCalled();
      expect(MockedTransaction.update).toHaveBeenCalledWith(
        { categoryId: fallback.id },
        { where: { userId: 'user-1', categoryId: 'cat-1' }, transaction: { id: 'tx-1' } },
      );
      expect(MockedRecurringTransaction.update).toHaveBeenCalledWith(
        { categoryId: fallback.id },
        { where: { userId: 'user-1', categoryId: 'cat-1' }, transaction: { id: 'tx-1' } },
      );
      expect(cat.destroy).toHaveBeenCalledWith({ transaction: { id: 'tx-1' } });
    });

    it('throws if fallback category is not found during delete', async () => {
      const cat = mockCategory();
      (MockedCategory.findOne as jest.Mock).mockResolvedValueOnce(cat);

      (sequelize.transaction as jest.Mock).mockImplementation(
        async (fn: (t: unknown) => Promise<void>) => {
          const tx = { id: 'tx-1' };
          await fn(tx);
        },
      );

      (MockedCategory.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.delete('cat-1', 'user-1')).rejects.toThrow(NotFoundError);
      expect(cat.destroy).not.toHaveBeenCalled();
    });
  });
});
