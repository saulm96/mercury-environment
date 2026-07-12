import { BudgetsService } from '../src/services/budgets.service';
import Budget from '../src/models/budget.model';
import Category from '../src/models/category.model';
import Transaction from '../src/models/transaction.model';
import { sequelize } from '../src/config/database';
import { NotFoundError, ForbiddenError } from '../src/middleware/error.middleware';

jest.mock('../src/models/budget.model');
jest.mock('../src/models/category.model');
jest.mock('../src/models/transaction.model');
jest.mock('../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(),
  },
}));

const MockedBudget = Budget as jest.Mocked<typeof Budget>;
const MockedCategory = Category as jest.Mocked<typeof Category>;
const MockedTransaction = Transaction as jest.Mocked<typeof Transaction>;
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
    toJSON: jest.fn().mockReturnValue({ id: 'cat-1', userId: 'user-1', name: 'Food', color: '#FF6B6B', type: 'expense', isFallback: false }),
    ...overrides,
  } as unknown as Category;
}

function mockBudget(overrides: Partial<Budget> = {}): Budget {
  const categories = overrides.categories as Category[] || [mockCategory()];
  const base = {
    id: 'budget-1',
    userId: 'user-1',
    name: 'Essentials',
    value: 50,
    period: 'monthly' as const,
    categories,
    createdAt: new Date(),
    updatedAt: new Date(),
    $add: jest.fn().mockResolvedValue(undefined),
    $set: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    toJSON: jest.fn().mockReturnValue({
      id: 'budget-1',
      userId: 'user-1',
      name: 'Essentials',
      value: 50,
      period: 'monthly',
      categories: [mockCategory().toJSON()],
    }),
    ...overrides,
  };
  return base as unknown as Budget;
}

function mockTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    userId: 'user-1',
    categoryId: 'cat-1',
    type: 'expense' as const,
    amount: 100,
    description: 'Test',
    date: '2026-07-01',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as Transaction;
}

describe('BudgetsService', () => {
  let service: BudgetsService;

  beforeEach(() => {
    service = new BudgetsService();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns user-scoped budgets with categories', async () => {
      const budgets = [mockBudget(), mockBudget({ id: 'budget-2', name: 'Leisure' })];
      (MockedBudget.findAll as jest.Mock).mockResolvedValue(budgets);

      const result = await service.findAll('user-1');

      expect(result).toEqual(budgets);
      expect(MockedBudget.findAll).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: [Category],
      });
    });
  });

  describe('findById', () => {
    it('returns budget with categories when found', async () => {
      const budget = mockBudget();
      (MockedBudget.findOne as jest.Mock).mockResolvedValue(budget);

      const result = await service.findById('budget-1', 'user-1');

      expect(result).toEqual(budget);
      expect(MockedBudget.findOne).toHaveBeenCalledWith({
        where: { id: 'budget-1', userId: 'user-1' },
        include: [Category],
      });
    });

    it('throws NotFoundError when budget is not found', async () => {
      (MockedBudget.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('budget-1', 'user-1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('creates budget with categories in a transaction', async () => {
      const budget = mockBudget();
      const createdBudget = mockBudget();
      const cats = [mockCategory(), mockCategory({ id: 'cat-2', name: 'Transport' })];

      (MockedBudget.create as jest.Mock).mockResolvedValue(createdBudget);
      (MockedCategory.findAll as jest.Mock).mockResolvedValue(cats);

      (sequelize.transaction as jest.Mock).mockImplementation(
        async (fn: (t: unknown) => Promise<Budget>) => {
          return fn({ id: 'tx-1' });
        },
      );

      const data = {
        name: 'Essentials',
        value: 50,
        categoryIds: ['cat-1', 'cat-2'],
      };

      const result = await service.create('user-1', data);

      expect(MockedBudget.create).toHaveBeenCalledWith(
        { name: 'Essentials', value: 50, period: undefined, userId: 'user-1' },
        { transaction: { id: 'tx-1' } },
      );
      expect(MockedCategory.findAll).toHaveBeenCalledWith({
        where: { id: ['cat-1', 'cat-2'], userId: 'user-1', type: 'expense' },
        transaction: { id: 'tx-1' },
      });
      expect(createdBudget.$add).toHaveBeenCalledWith('categories', cats, { transaction: { id: 'tx-1' } });
      expect(createdBudget.reload).toHaveBeenCalledWith({
        include: [Category],
        transaction: { id: 'tx-1' },
      });
      expect(result).toEqual(createdBudget);
    });

    it('throws ForbiddenError if categoryIds include categories not owned by user', async () => {
      const createdBudget = mockBudget();
      (MockedBudget.create as jest.Mock).mockResolvedValue(createdBudget);
      (MockedCategory.findAll as jest.Mock).mockResolvedValue([mockCategory()]);

      (sequelize.transaction as jest.Mock).mockImplementation(
        async (fn: (t: unknown) => Promise<Budget>) => {
          return fn({ id: 'tx-1' });
        },
      );

      const data = {
        name: 'Essentials',
        value: 50,
        categoryIds: ['cat-1', 'cat-2'],
      };

      await expect(service.create('user-1', data)).rejects.toThrow('Budgets can only include expense categories');
    });

    it('throws ForbiddenError if categoryIds include non-expense categories', async () => {
      const createdBudget = mockBudget();
      (MockedBudget.create as jest.Mock).mockResolvedValue(createdBudget);
      (MockedCategory.findAll as jest.Mock).mockResolvedValue([]);

      (sequelize.transaction as jest.Mock).mockImplementation(
        async (fn: (t: unknown) => Promise<Budget>) => {
          return fn({ id: 'tx-1' });
        },
      );

      const data = {
        name: 'Essentials',
        value: 50,
        categoryIds: ['cat-1'],
      };

      await expect(service.create('user-1', data)).rejects.toThrow('Budgets can only include expense categories');
    });
  });

  describe('update', () => {
    it('modifies budget fields and replaces categories', async () => {
      const budget = mockBudget();
      const cats = [mockCategory({ id: 'cat-2', name: 'Transport' })];

      (MockedBudget.findOne as jest.Mock).mockResolvedValue(budget);
      (MockedCategory.findAll as jest.Mock).mockResolvedValue(cats);

      (sequelize.transaction as jest.Mock).mockImplementation(
        async (fn: (t: unknown) => Promise<Budget>) => {
          return fn({ id: 'tx-1' });
        },
      );

      const updateData = {
        name: 'Updated Budget',
        value: 60,
        categoryIds: ['cat-2'],
      };

      const result = await service.update('budget-1', 'user-1', updateData);

      expect(MockedBudget.findOne).toHaveBeenCalledWith({
        where: { id: 'budget-1', userId: 'user-1' },
        transaction: { id: 'tx-1' },
      });
      expect(budget.save).toHaveBeenCalledWith({ transaction: { id: 'tx-1' } });
      expect(budget.name).toBe('Updated Budget');
      expect(budget.value).toBe(60);
      expect(budget.$set).toHaveBeenCalledWith('categories', cats, { transaction: { id: 'tx-1' } });
      expect(budget.reload).toHaveBeenCalledWith({
        include: [Category],
        transaction: { id: 'tx-1' },
      });
      expect(result).toEqual(budget);
    });

    it('throws NotFoundError for non-existent budget', async () => {
      (MockedBudget.findOne as jest.Mock).mockResolvedValue(null);

      (sequelize.transaction as jest.Mock).mockImplementation(
        async (fn: (t: unknown) => Promise<Budget>) => {
          return fn({ id: 'tx-1' });
        },
      );

      await expect(service.update('budget-1', 'user-1', { name: 'New' })).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError if new categoryIds include unauthorized categories', async () => {
      const budget = mockBudget();
      (MockedBudget.findOne as jest.Mock).mockResolvedValue(budget);
      (MockedCategory.findAll as jest.Mock).mockResolvedValue([mockCategory()]);

      (sequelize.transaction as jest.Mock).mockImplementation(
        async (fn: (t: unknown) => Promise<Budget>) => {
          return fn({ id: 'tx-1' });
        },
      );

      await expect(
        service.update('budget-1', 'user-1', { categoryIds: ['cat-1', 'cat-2'] }),
      ).rejects.toThrow('Budgets can only include expense categories');
    });
  });

  describe('delete', () => {
    it('soft-deletes the budget and returns void', async () => {
      const budget = mockBudget();
      (MockedBudget.findOne as jest.Mock).mockResolvedValue(budget);

      const result = await service.delete('budget-1', 'user-1');

      expect(MockedBudget.findOne).toHaveBeenCalledWith({
        where: { id: 'budget-1', userId: 'user-1' },
      });
      expect(budget.destroy).toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('throws NotFoundError for non-existent budget', async () => {
      (MockedBudget.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('budget-1', 'user-1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getStats', () => {
    it('calculates correct allocations, spent amounts, and statuses', async () => {
      const cat1 = mockCategory({ id: 'cat-1', name: 'Food' });
      const cat2 = mockCategory({ id: 'cat-2', name: 'Transport' });

      (MockedTransaction.sum as jest.Mock)
        .mockResolvedValueOnce(5000)
        .mockResolvedValueOnce(2500);

      (MockedTransaction.findAll as jest.Mock).mockResolvedValue([
        mockTransaction({ categoryId: 'cat-1', amount: 2000 }),
        mockTransaction({ categoryId: 'cat-1', amount: 500 }),
        mockTransaction({ categoryId: 'cat-2', amount: 800 }),
      ]);

      const budget1 = mockBudget({
        id: 'budget-1',
        name: 'Essentials',
        value: 2500,
        categories: [cat1, cat2] as any,
      });

      const budget2 = mockBudget({
        id: 'budget-2',
        name: 'Rent',
        value: 1000,
        categories: [cat2] as any,
      });

      (MockedBudget.findAll as jest.Mock).mockResolvedValue([budget1, budget2]);

      const result = await service.getStats('user-1', 2026, 7);

      expect(result.period).toEqual({ year: 2026, month: 7 });
      expect(result.totalIncome).toBe(5000);
      expect(result.totalExpenses).toBe(2500);

      expect(result.budgets).toHaveLength(2);

      const essentials = result.budgets[0];
      expect(essentials.name).toBe('Essentials');
      expect(essentials.allocated).toBe(2500);
      expect(essentials.spent).toBe(3300);
      expect(essentials.status).toBe('over');

      const rent = result.budgets[1];
      expect(rent.name).toBe('Rent');
      expect(rent.allocated).toBe(1000);
      expect(rent.spent).toBe(800);
      expect(rent.status).toBe('warning');

      expect(result.totalAllocated).toBe(3500);
      expect(result.estimatedSavings).toBe(1500);
      expect(result.actualSavings).toBe(2500);
    });
  });
});
