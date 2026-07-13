import { Op } from 'sequelize';
import { RecurringTransactionsService } from '../src/services/recurring-transactions.service';
import RecurringTransaction from '../src/models/recurring-transaction.model';
import RecurringSkip from '../src/models/recurring-skip.model';
import Transaction from '../src/models/transaction.model';
import Subscription from '../src/models/subscription.model';
import Category from '../src/models/category.model';
import { sequelize } from '../src/config/database';
import { NotFoundError } from '../src/middleware/error.middleware';

jest.mock('../src/models/recurring-transaction.model');
jest.mock('../src/models/recurring-skip.model');
jest.mock('../src/models/transaction.model');
jest.mock('../src/models/subscription.model');
jest.mock('../src/models/category.model');
jest.mock('../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(),
  },
}));
jest.mock('../src/config/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const MockedRecurringTransaction = RecurringTransaction as jest.Mocked<typeof RecurringTransaction>;
const MockedRecurringSkip = RecurringSkip as jest.Mocked<typeof RecurringSkip>;
const MockedTransaction = Transaction as jest.Mocked<typeof Transaction>;
const MockedSubscription = Subscription as jest.Mocked<typeof Subscription>;
const MockedSequelize = sequelize as jest.Mocked<typeof sequelize>;

function mockRecurring(overrides: Partial<RecurringTransaction> = {}): RecurringTransaction {
  const base = {
    id: 'rec-1',
    userId: 'user-1',
    categoryId: 'cat-1',
    type: 'expense' as const,
    amount: 100,
    description: 'Test recurring',
    frequency: 'daily' as const,
    interval: 1,
    startDate: '2024-01-01',
    endDate: null,
    nextDate: '2024-01-01',
    dayOfMonth: null,
    dayOfWeek: null,
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as RecurringTransaction;

  (base as any).update = jest.fn().mockResolvedValue(undefined);
  (base as any).destroy = jest.fn().mockResolvedValue(undefined);
  (base as any).reload = jest.fn().mockResolvedValue(base);

  return base;
}

function mockSkip(overrides: Partial<RecurringSkip> = {}): RecurringSkip {
  const base = {
    id: 'skip-1',
    recurringTransactionId: 'rec-1',
    occurrenceDate: '2024-01-02',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as RecurringSkip;

  (base as any).destroy = jest.fn().mockResolvedValue(undefined);
  (base as any).toJSON = () => ({ ...base });

  return base;
}

describe('RecurringTransactionsService', () => {
  let service: RecurringTransactionsService;

  beforeEach(() => {
    service = new RecurringTransactionsService();
    jest.clearAllMocks();

    (MockedSequelize.transaction as jest.Mock).mockImplementation(
      async (fn: (t: unknown) => Promise<unknown>) => {
        const t = { id: 'tx-1' };
        return await fn(t);
      },
    );
  });

  describe('findAll', () => {
    it('returns user-scoped recurring transactions with category eager-loaded', async () => {
      const recs = [mockRecurring(), mockRecurring({ id: 'rec-2', description: 'Other' })];
      (MockedRecurringTransaction.findAll as jest.Mock).mockResolvedValue(recs);

      const result = await service.findAll('user-1');

      expect(result).toEqual(recs);
      expect(MockedRecurringTransaction.findAll).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: [Category],
      });
    });
  });

  describe('findById', () => {
    it('returns the recurring transaction when found', async () => {
      const rec = mockRecurring();
      (MockedRecurringTransaction.findOne as jest.Mock).mockResolvedValue(rec);

      const result = await service.findById('rec-1', 'user-1');

      expect(result).toEqual(rec);
      expect(MockedRecurringTransaction.findOne).toHaveBeenCalledWith({
        where: { id: 'rec-1', userId: 'user-1' },
        include: [Category],
      });
    });

    it('throws NotFoundError when recurring transaction is not found', async () => {
      (MockedRecurringTransaction.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('rec-1', 'user-1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('creates a recurring transaction with startDate mapped from date', async () => {
      const rec = mockRecurring();
      (MockedRecurringTransaction.create as jest.Mock).mockResolvedValue(rec);

      const data = {
        type: 'expense',
        amount: 100,
        description: 'Test',
        date: '2024-01-01',
        frequency: 'daily',
      };
      const result = await service.create('user-1', data as any);

      expect(MockedRecurringTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: 'expense',
          amount: 100,
          description: 'Test',
          startDate: '2024-01-01',
          nextDate: '2024-01-01',
          frequency: 'daily',
        }),
      );
      expect(rec.reload).toHaveBeenCalledWith({ include: [Category] });
      expect(result).toEqual(rec);
    });
  });

  describe('update', () => {
    it('patches allowed fields and returns the updated recurring transaction', async () => {
      const rec = mockRecurring();
      (MockedRecurringTransaction.findOne as jest.Mock).mockResolvedValue(rec);

      const data = { description: 'Updated description', amount: 200 };
      const result = await service.update('rec-1', 'user-1', data as any);

      expect(rec.update).toHaveBeenCalledWith(data);
      expect(rec.reload).toHaveBeenCalledWith({ include: [Category] });
      expect(result).toEqual(rec);
    });

    it('maps date to startDate on update', async () => {
      const rec = mockRecurring();
      (MockedRecurringTransaction.findOne as jest.Mock).mockResolvedValue(rec);

      await service.update('rec-1', 'user-1', { date: '2024-02-01' } as any);

      expect(rec.update).toHaveBeenCalledWith({ startDate: '2024-02-01' });
    });

    it('throws NotFoundError for a non-existent ID', async () => {
      (MockedRecurringTransaction.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.update('rec-1', 'user-1', {} as any)).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('soft-deletes the recurring transaction and its linked subscription', async () => {
      const rec = mockRecurring();
      (MockedRecurringTransaction.findOne as jest.Mock).mockResolvedValue(rec);
      (MockedSubscription.destroy as jest.Mock).mockResolvedValue(0);

      const result = await service.delete('rec-1', 'user-1');

      expect(rec.destroy).toHaveBeenCalled();
      expect(MockedSubscription.destroy).toHaveBeenCalledWith({
        where: { recurringTransactionId: 'rec-1' },
      });
      expect(result).toBeUndefined();
    });

    it('throws NotFoundError for a non-existent ID', async () => {
      (MockedRecurringTransaction.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('rec-1', 'user-1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('skipDate', () => {
    it('creates a skip when it does not exist', async () => {
      const rec = mockRecurring();
      const skip = mockSkip();
      (MockedRecurringTransaction.findOne as jest.Mock).mockResolvedValue(rec);
      (MockedRecurringSkip.findOrCreate as jest.Mock).mockResolvedValue([skip, true]);

      const result = await service.skipDate('rec-1', 'user-1', '2024-01-02');

      expect(MockedRecurringSkip.findOrCreate).toHaveBeenCalledWith({
        where: { recurringTransactionId: 'rec-1', occurrenceDate: '2024-01-02' },
        defaults: { recurringTransactionId: 'rec-1', occurrenceDate: '2024-01-02' },
      });
      expect(result).toEqual(skip.toJSON());
    });

    it('throws NotFoundError when recurring transaction does not exist', async () => {
      (MockedRecurringTransaction.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.skipDate('rec-1', 'user-1', '2024-01-02')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('unskipDate', () => {
    it('soft-deletes an existing skip', async () => {
      const rec = mockRecurring();
      const skip = mockSkip();
      (MockedRecurringTransaction.findOne as jest.Mock).mockResolvedValue(rec);
      (MockedRecurringSkip.findOne as jest.Mock).mockResolvedValue(skip);

      await service.unskipDate('rec-1', 'user-1', '2024-01-02');

      expect(skip.destroy).toHaveBeenCalled();
    });

    it('throws NotFoundError when skip does not exist', async () => {
      const rec = mockRecurring();
      (MockedRecurringTransaction.findOne as jest.Mock).mockResolvedValue(rec);
      (MockedRecurringSkip.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.unskipDate('rec-1', 'user-1', '2024-01-02')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('processDue', () => {
    it('generates due occurrences and advances nextDate', async () => {
      jest.spyOn(service as any, 'getToday').mockReturnValue('2024-01-03');

      const rec = mockRecurring({ nextDate: '2024-01-01', frequency: 'daily', interval: 1 });
      (MockedRecurringTransaction.findAll as jest.Mock).mockResolvedValue([rec]);
      (MockedRecurringSkip.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.create as jest.Mock).mockResolvedValue({ id: 'tx-1' });

      const result = await service.processDue('user-1');

      expect(result.generated).toBe(3);
      expect(MockedTransaction.create).toHaveBeenCalledTimes(3);
      expect(rec.update).toHaveBeenCalledWith(
        { nextDate: '2024-01-04' },
        { transaction: expect.any(Object) },
      );
    });

    it('respects endDate and stops generating after it', async () => {
      jest.spyOn(service as any, 'getToday').mockReturnValue('2024-01-05');

      const rec = mockRecurring({
        nextDate: '2024-01-01',
        frequency: 'daily',
        interval: 1,
        endDate: '2024-01-02',
      });
      (MockedRecurringTransaction.findAll as jest.Mock).mockResolvedValue([rec]);
      (MockedRecurringSkip.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.create as jest.Mock).mockResolvedValue({ id: 'tx-1' });

      const result = await service.processDue('user-1');

      expect(result.generated).toBe(2);
      expect(MockedTransaction.create).toHaveBeenCalledTimes(2);
    });

    it('skips occurrences that have a RecurringSkip', async () => {
      jest.spyOn(service as any, 'getToday').mockReturnValue('2024-01-03');

      const rec = mockRecurring({ nextDate: '2024-01-01', frequency: 'daily', interval: 1 });
      (MockedRecurringTransaction.findAll as jest.Mock).mockResolvedValue([rec]);
      (MockedRecurringSkip.findOne as jest.Mock).mockImplementation((args: any) => {
        if (args.where.occurrenceDate === '2024-01-02') return Promise.resolve(mockSkip());
        return Promise.resolve(null);
      });
      (MockedTransaction.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.create as jest.Mock).mockResolvedValue({ id: 'tx-1' });

      const result = await service.processDue('user-1');

      expect(result.generated).toBe(2);
      expect(MockedTransaction.create).toHaveBeenCalledTimes(2);
    });

    it('does not regenerate existing transactions including soft-deleted ones', async () => {
      jest.spyOn(service as any, 'getToday').mockReturnValue('2024-01-02');

      const rec = mockRecurring({ nextDate: '2024-01-01', frequency: 'daily', interval: 1 });
      (MockedRecurringTransaction.findAll as jest.Mock).mockResolvedValue([rec]);
      (MockedRecurringSkip.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.findOne as jest.Mock).mockResolvedValue({ id: 'existing-1' });
      (MockedTransaction.create as jest.Mock).mockResolvedValue({ id: 'tx-1' });

      const result = await service.processDue('user-1');

      expect(result.generated).toBe(0);
      expect(MockedTransaction.create).not.toHaveBeenCalled();
    });

    it('queries skips and transactions with paranoid disabled', async () => {
      jest.spyOn(service as any, 'getToday').mockReturnValue('2024-01-01');

      const rec = mockRecurring({ nextDate: '2024-01-01', frequency: 'daily', interval: 1 });
      (MockedRecurringTransaction.findAll as jest.Mock).mockResolvedValue([rec]);
      (MockedRecurringSkip.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.create as jest.Mock).mockResolvedValue({ id: 'tx-1' });

      await service.processDue('user-1');

      expect(MockedRecurringSkip.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ paranoid: false }),
      );
      expect(MockedTransaction.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ paranoid: false }),
      );
    });

    it('passes errors to errors array and continues processing other recurrings', async () => {
      jest.spyOn(service as any, 'getToday').mockReturnValue('2024-01-01');

      const rec = mockRecurring({ nextDate: '2024-01-01' });
      (MockedRecurringTransaction.findAll as jest.Mock).mockResolvedValue([rec]);
      (MockedSequelize.transaction as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await service.processDue('user-1');

      expect(result.generated).toBe(0);
      expect(result.errors).toContain('DB error');
    });

    it('handles errors in the outer processDue block', async () => {
      (MockedRecurringTransaction.findAll as jest.Mock).mockRejectedValue(new Error('FindAll failed'));

      const result = await service.processDue('user-1');

      expect(result.generated).toBe(0);
      expect(result.errors).toContain('FindAll failed');
    });

    it('uses the real getToday when not mocked', async () => {
      (MockedRecurringTransaction.findAll as jest.Mock).mockResolvedValue([]);

      const result = await service.processDue('user-1');

      expect(result.generated).toBe(0);
      expect(MockedRecurringTransaction.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            nextDate: { [Op.lte]: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
          }),
        }),
      );
    });

    it('generates weekly occurrences anchored to dayOfWeek', async () => {
      jest.spyOn(service as any, 'getToday').mockReturnValue('2024-01-10');

      const rec = mockRecurring({
        nextDate: '2024-01-01',
        frequency: 'weekly',
        interval: 1,
        dayOfWeek: 3,
      });
      (MockedRecurringTransaction.findAll as jest.Mock).mockResolvedValue([rec]);
      (MockedRecurringSkip.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.create as jest.Mock).mockResolvedValue({ id: 'tx-1' });

      const result = await service.processDue('user-1');

      expect(result.generated).toBe(3);
      expect(rec.update).toHaveBeenCalledWith(
        { nextDate: '2024-01-17' },
        { transaction: expect.any(Object) },
      );
    });

    it('generates monthly occurrences anchored to dayOfMonth', async () => {
      jest.spyOn(service as any, 'getToday').mockReturnValue('2024-03-05');

      const rec = mockRecurring({
        nextDate: '2024-01-15',
        frequency: 'monthly',
        interval: 1,
        dayOfMonth: 1,
      });
      (MockedRecurringTransaction.findAll as jest.Mock).mockResolvedValue([rec]);
      (MockedRecurringSkip.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.create as jest.Mock).mockResolvedValue({ id: 'tx-1' });

      const result = await service.processDue('user-1');

      expect(result.generated).toBe(3);
      expect(rec.update).toHaveBeenCalledWith(
        { nextDate: '2024-04-01' },
        { transaction: expect.any(Object) },
      );
    });

    it('generates yearly occurrences and clamps dayOfMonth to month length', async () => {
      jest.spyOn(service as any, 'getToday').mockReturnValue('2026-01-25');

      const rec = mockRecurring({
        nextDate: '2024-01-15',
        frequency: 'yearly',
        interval: 1,
        dayOfMonth: 31,
      });
      (MockedRecurringTransaction.findAll as jest.Mock).mockResolvedValue([rec]);
      (MockedRecurringSkip.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.create as jest.Mock).mockResolvedValue({ id: 'tx-1' });

      const result = await service.processDue('user-1');

      expect(result.generated).toBe(2);
      expect(rec.update).toHaveBeenCalledWith(
        { nextDate: '2026-01-31' },
        { transaction: expect.any(Object) },
      );
    });

    it('generates weekly occurrences without dayOfWeek', async () => {
      jest.spyOn(service as any, 'getToday').mockReturnValue('2024-01-15');

      const rec = mockRecurring({
        nextDate: '2024-01-01',
        frequency: 'weekly',
        interval: 1,
        dayOfWeek: null,
      });
      (MockedRecurringTransaction.findAll as jest.Mock).mockResolvedValue([rec]);
      (MockedRecurringSkip.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.create as jest.Mock).mockResolvedValue({ id: 'tx-1' });

      const result = await service.processDue('user-1');

      expect(result.generated).toBe(3);
      expect(rec.update).toHaveBeenCalledWith(
        { nextDate: '2024-01-22' },
        { transaction: expect.any(Object) },
      );
    });

    it('generates monthly occurrences without dayOfMonth', async () => {
      jest.spyOn(service as any, 'getToday').mockReturnValue('2024-03-15');

      const rec = mockRecurring({
        nextDate: '2024-01-15',
        frequency: 'monthly',
        interval: 1,
        dayOfMonth: null,
      });
      (MockedRecurringTransaction.findAll as jest.Mock).mockResolvedValue([rec]);
      (MockedRecurringSkip.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.create as jest.Mock).mockResolvedValue({ id: 'tx-1' });

      const result = await service.processDue('user-1');

      expect(result.generated).toBe(3);
      expect(rec.update).toHaveBeenCalledWith(
        { nextDate: '2024-04-15' },
        { transaction: expect.any(Object) },
      );
    });

    it('generates yearly occurrences without dayOfMonth', async () => {
      jest.spyOn(service as any, 'getToday').mockReturnValue('2027-01-20');

      const rec = mockRecurring({
        nextDate: '2024-01-15',
        frequency: 'yearly',
        interval: 1,
        dayOfMonth: null,
      });
      (MockedRecurringTransaction.findAll as jest.Mock).mockResolvedValue([rec]);
      (MockedRecurringSkip.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.findOne as jest.Mock).mockResolvedValue(null);
      (MockedTransaction.create as jest.Mock).mockResolvedValue({ id: 'tx-1' });

      const result = await service.processDue('user-1');

      expect(result.generated).toBe(4);
      expect(rec.update).toHaveBeenCalledWith(
        { nextDate: '2028-01-15' },
        { transaction: expect.any(Object) },
      );
    });

    it('reports unsupported frequency as a per-recurring error', async () => {
      jest.spyOn(service as any, 'getToday').mockReturnValue('2024-01-01');

      const rec = mockRecurring({
        nextDate: '2024-01-01',
        frequency: 'invalid' as any,
      });
      (MockedRecurringTransaction.findAll as jest.Mock).mockResolvedValue([rec]);

      const result = await service.processDue('user-1');

      expect(result.generated).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Unsupported frequency');
    });
  });
});
