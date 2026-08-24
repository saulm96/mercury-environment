import { SubscriptionsService } from '../src/services/subscription.service';
import Subscription from '../src/models/subscription.model';
import RecurringTransaction from '../src/models/recurring-transaction.model';
import Category from '../src/models/category.model';
import { NotFoundError, ForbiddenError } from '../src/middleware/error.middleware';

jest.mock('../src/models/subscription.model');
jest.mock('../src/models/recurring-transaction.model');
jest.mock('../src/models/category.model');

const MockedSubscription = Subscription as jest.Mocked<typeof Subscription>;
const MockedRecurringTransaction = RecurringTransaction as jest.Mocked<typeof RecurringTransaction>;

function mockRecurring(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rec-1',
    userId: 'user-1',
    categoryId: null,
    type: 'expense',
    amount: 100,
    description: 'Test recurring',
    frequency: 'monthly',
    interval: 1,
    startDate: '2024-01-01',
    endDate: null,
    nextDate: '2099-01-15',
    dayOfMonth: null,
    dayOfWeek: null,
    status: 'active',
    category: null,
    ...overrides,
  } as unknown as RecurringTransaction;
}

function mockSubscription(overrides: Record<string, unknown> = {}) {
  const data = {
    id: 'sub-1',
    userId: 'user-1',
    recurringTransactionId: 'rec-1',
    serviceType: 'streaming',
    recurringTransaction: mockRecurring(),
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
  return {
    ...data,
    update: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn().mockResolvedValue(data),
    toJSON: () => data,
  } as unknown as Subscription;
}

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  beforeEach(() => {
    service = new SubscriptionsService();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all subscriptions scoped to the user with recurring transaction and category', async () => {
      const subs = [mockSubscription(), mockSubscription({ id: 'sub-2' })];
      MockedSubscription.findAll.mockResolvedValue(subs as any);

      const result = await service.findAll('user-1');

      expect(MockedSubscription.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          include: expect.any(Array),
        }),
      );
      expect(result).toEqual(subs);
    });
  });

  describe('findById', () => {
    it('returns the subscription when found and owned', async () => {
      const sub = mockSubscription();
      MockedSubscription.findOne.mockResolvedValue(sub as any);

      const result = await service.findById('sub-1', 'user-1');

      expect(MockedSubscription.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sub-1', userId: 'user-1' },
          include: expect.any(Array),
        }),
      );
      expect(result).toEqual(sub);
    });

    it('throws NotFoundError when subscription does not exist', async () => {
      MockedSubscription.findOne.mockResolvedValue(null);

      await expect(service.findById('sub-1', 'user-1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('creates a subscription for an owned recurring transaction', async () => {
      MockedRecurringTransaction.findOne.mockResolvedValue(mockRecurring() as any);
      MockedSubscription.findOne.mockResolvedValue(null);
      const sub = mockSubscription();
      MockedSubscription.create.mockResolvedValue(sub as any);

      const result = await service.create('user-1', {
        recurringTransactionId: 'rec-1',
        serviceType: 'streaming',
      });

      expect(MockedRecurringTransaction.findOne).toHaveBeenCalledWith({
        where: { id: 'rec-1', userId: 'user-1' },
      });
      expect(MockedSubscription.findOne).toHaveBeenCalledWith({
        where: { recurringTransactionId: 'rec-1' },
        paranoid: false,
      });
      expect(MockedSubscription.create).toHaveBeenCalledWith({
        recurringTransactionId: 'rec-1',
        serviceType: 'streaming',
        userId: 'user-1',
      });
      expect((sub as any).reload).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });

    it('throws NotFoundError when recurring transaction does not exist or is not owned', async () => {
      MockedRecurringTransaction.findOne.mockResolvedValue(null);

      await expect(
        service.create('user-1', { recurringTransactionId: 'rec-1', serviceType: 'streaming' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when a subscription already exists for the recurring transaction', async () => {
      MockedRecurringTransaction.findOne.mockResolvedValue(mockRecurring() as any);
      MockedSubscription.findOne.mockResolvedValue(mockSubscription() as any);

      await expect(
        service.create('user-1', { recurringTransactionId: 'rec-1', serviceType: 'streaming' }),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('update', () => {
    it('updates the service type and returns the refreshed subscription', async () => {
      const sub = mockSubscription();
      MockedSubscription.findOne.mockResolvedValue(sub as any);

      await service.update('sub-1', 'user-1', { serviceType: 'ai' });

      expect((sub as any).serviceType).toBe('ai');
      expect((sub as any).save).toHaveBeenCalled();
      expect((sub as any).reload).toHaveBeenCalled();
    });

    it('throws NotFoundError when subscription does not exist', async () => {
      MockedSubscription.findOne.mockResolvedValue(null);

      await expect(service.update('sub-1', 'user-1', { serviceType: 'ai' })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('delete', () => {
    it('soft-deletes the subscription', async () => {
      const sub = mockSubscription();
      MockedSubscription.findOne.mockResolvedValue(sub as any);

      await service.delete('sub-1', 'user-1');

      expect((sub as any).destroy).toHaveBeenCalled();
    });

    it('throws NotFoundError when subscription does not exist', async () => {
      MockedSubscription.findOne.mockResolvedValue(null);

      await expect(service.delete('sub-1', 'user-1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getStats', () => {
    it('computes normalized monthly totals and the nearest renewal', async () => {
      const subs = [
        mockSubscription({
          id: 'sub-1',
          serviceType: 'streaming',
          recurringTransaction: mockRecurring({
            amount: 12,
            frequency: 'monthly',
            interval: 1,
            startDate: '2024-01-01',
            endDate: null,
            nextDate: '2099-01-10',
            description: 'Netflix',
          }),
        }),
        mockSubscription({
          id: 'sub-2',
          serviceType: 'ai',
          recurringTransaction: mockRecurring({
            id: 'rec-2',
            amount: 120,
            frequency: 'yearly',
            interval: 1,
            startDate: '2024-01-01',
            endDate: null,
            nextDate: '2099-01-20',
            description: 'ChatGPT',
          }),
        }),
      ];
      MockedSubscription.findAll.mockResolvedValue(subs as any);

      const result = await service.getStats('user-1', 2099, 1);

      expect(result.monthlyTotal).toBe(22); // 12 + 10
      expect(result.yearlyTotal).toBe(264);
      expect(result.activeCount).toBe(2);
      expect(result.nextRenewal).toEqual({
        description: 'Netflix',
        date: '2099-01-10',
        daysUntil: expect.any(Number),
      });
    });

    it('excludes subscriptions starting after the target month', async () => {
      const subs = [
        mockSubscription({
          id: 'sub-1',
          recurringTransaction: mockRecurring({
            amount: 100,
            frequency: 'monthly',
            startDate: '2024-02-01',
            endDate: null,
            nextDate: '2099-02-15',
          }),
        }),
      ];
      MockedSubscription.findAll.mockResolvedValue(subs as any);

      const result = await service.getStats('user-1', 2024, 1);

      expect(result.monthlyTotal).toBe(0);
      expect(result.yearlyTotal).toBe(0);
      expect(result.activeCount).toBe(0);
    });

    it('excludes subscriptions with endDate before the target month', async () => {
      const subs = [
        mockSubscription({
          id: 'sub-1',
          recurringTransaction: mockRecurring({
            amount: 100,
            frequency: 'monthly',
            startDate: '2023-01-01',
            endDate: '2023-12-31',
            nextDate: '2099-01-15',
          }),
        }),
      ];
      MockedSubscription.findAll.mockResolvedValue(subs as any);

      const result = await service.getStats('user-1', 2024, 1);

      expect(result.monthlyTotal).toBe(0);
      expect(result.yearlyTotal).toBe(0);
      expect(result.activeCount).toBe(0);
    });

    it('includes subscriptions that overlap the target month', async () => {
      const subs = [
        mockSubscription({
          id: 'sub-1',
          recurringTransaction: mockRecurring({
            amount: 100,
            frequency: 'monthly',
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            nextDate: '2099-01-15',
          }),
        }),
      ];
      MockedSubscription.findAll.mockResolvedValue(subs as any);

      const result = await service.getStats('user-1', 2024, 1);

      expect(result.monthlyTotal).toBe(100);
      expect(result.yearlyTotal).toBe(1200);
      expect(result.activeCount).toBe(1);
    });

    it('falls back to global behavior when year or month is missing or NaN', async () => {
      const subs = [
        mockSubscription({
          id: 'sub-1',
          recurringTransaction: mockRecurring({
            amount: 100,
            frequency: 'monthly',
            startDate: '2025-06-01',
            endDate: null,
            nextDate: '2099-06-15',
          }),
        }),
      ];
      MockedSubscription.findAll.mockResolvedValue(subs as any);

      const resultUndefined = await service.getStats('user-1');
      const resultNaN = await service.getStats('user-1', NaN, 1);

      expect(resultUndefined.monthlyTotal).toBe(100);
      expect(resultUndefined.activeCount).toBe(1);
      expect(resultNaN.monthlyTotal).toBe(100);
      expect(resultNaN.activeCount).toBe(1);
    });

    it('computes nextRenewal over all active subscriptions regardless of month filter', async () => {
      const subs = [
        mockSubscription({
          id: 'sub-1',
          recurringTransaction: mockRecurring({
            amount: 100,
            frequency: 'monthly',
            startDate: '2025-06-01',
            endDate: null,
            nextDate: '2099-06-15',
            description: 'Future subscription',
          }),
        }),
      ];
      MockedSubscription.findAll.mockResolvedValue(subs as any);

      const result = await service.getStats('user-1', 2024, 1);

      expect(result.monthlyTotal).toBe(0);
      expect(result.activeCount).toBe(0);
      expect(result.nextRenewal).toEqual({
        description: 'Future subscription',
        date: '2099-06-15',
        daysUntil: expect.any(Number),
      });
    });

    it('returns zero values when there are no active subscriptions', async () => {
      MockedSubscription.findAll.mockResolvedValue([]);

      const result = await service.getStats('user-1', 2099, 1);

      expect(result).toEqual({
        monthlyTotal: 0,
        yearlyTotal: 0,
        activeCount: 0,
        nextRenewal: null,
      });
    });
  });

  describe('getByServiceType', () => {
    it('groups active subscriptions by service type and sums normalized monthly amounts', async () => {
      const subs = [
        mockSubscription({
          serviceType: 'streaming',
          recurringTransaction: mockRecurring({ amount: 12, frequency: 'monthly' }),
        }),
        mockSubscription({
          id: 'sub-2',
          serviceType: 'streaming',
          recurringTransaction: mockRecurring({
            id: 'rec-2',
            amount: 24,
            frequency: 'monthly',
          }),
        }),
        mockSubscription({
          id: 'sub-3',
          serviceType: 'ai',
          recurringTransaction: mockRecurring({
            id: 'rec-3',
            amount: 120,
            frequency: 'yearly',
          }),
        }),
      ];
      MockedSubscription.findAll.mockResolvedValue(subs as any);

      const result = await service.getByServiceType('user-1');

      expect(result).toEqual([
        { serviceType: 'streaming', monthlyTotal: 36, count: 2 },
        { serviceType: 'ai', monthlyTotal: 10, count: 1 },
      ]);
    });

    it('applies the month overlap filter before grouping', async () => {
      const subs = [
        mockSubscription({
          id: 'sub-1',
          serviceType: 'streaming',
          recurringTransaction: mockRecurring({
            amount: 100,
            frequency: 'monthly',
            startDate: '2024-01-01',
            endDate: '2024-01-31',
          }),
        }),
        mockSubscription({
          id: 'sub-2',
          serviceType: 'streaming',
          recurringTransaction: mockRecurring({
            id: 'rec-2',
            amount: 50,
            frequency: 'monthly',
            startDate: '2024-02-01',
            endDate: null,
          }),
        }),
        mockSubscription({
          id: 'sub-3',
          serviceType: 'ai',
          recurringTransaction: mockRecurring({
            id: 'rec-3',
            amount: 120,
            frequency: 'yearly',
            startDate: '2023-01-01',
            endDate: '2023-12-31',
          }),
        }),
      ];
      MockedSubscription.findAll.mockResolvedValue(subs as any);

      const result = await service.getByServiceType('user-1', 2024, 1);

      expect(result).toEqual([
        { serviceType: 'streaming', monthlyTotal: 100, count: 1 },
      ]);
    });

    it('falls back to global behavior when year or month is missing or NaN', async () => {
      const subs = [
        mockSubscription({
          id: 'sub-1',
          serviceType: 'streaming',
          recurringTransaction: mockRecurring({
            amount: 100,
            frequency: 'monthly',
            startDate: '2025-06-01',
            endDate: null,
          }),
        }),
      ];
      MockedSubscription.findAll.mockResolvedValue(subs as any);

      const resultUndefined = await service.getByServiceType('user-1');
      const resultNaN = await service.getByServiceType('user-1', NaN, 1);

      expect(resultUndefined).toEqual([
        { serviceType: 'streaming', monthlyTotal: 100, count: 1 },
      ]);
      expect(resultNaN).toEqual([
        { serviceType: 'streaming', monthlyTotal: 100, count: 1 },
      ]);
    });
  });

  describe('getUpcomingRenewals', () => {
    it('filters active subscriptions by nextDate range', async () => {
      const subs = [mockSubscription()];
      MockedSubscription.findAll.mockResolvedValue(subs as any);

      const result = await service.getUpcomingRenewals('user-1', '2099-01-01', '2099-01-31');

      expect(MockedSubscription.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          include: expect.any(Array),
        }),
      );
      expect(result).toEqual(subs);
    });
  });
});
