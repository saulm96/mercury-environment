import { renderHook, waitFor, act } from '@testing-library/react';
import { useSubscriptions, resetSubscriptionsCache } from '../../src/hooks/useSubscriptions';
import { api } from '../../src/lib/api';
import type { Subscription, SubscriptionSummary, ServiceTypeStat } from '@mercury/shared';

jest.mock('../../src/lib/api');

const mockedApi = api as jest.Mocked<typeof api>;

const mockRecurringTransaction = {
  id: 'rt-1',
  userId: 'user-1',
  categoryId: 'cat-1',
  type: 'expense' as const,
  amount: 12.99,
  description: 'Netflix',
  frequency: 'monthly' as const,
  interval: 1,
  startDate: '2025-01-01',
  endDate: null,
  nextDate: '2025-08-15',
  dayOfMonth: 15,
  dayOfWeek: null,
  status: 'active' as const,
  category: {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Entertainment',
    color: '#FF6B6B',
    type: 'expense' as const,
    isFallback: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSubscription: Subscription = {
  id: 'sub-1',
  userId: 'user-1',
  recurringTransactionId: 'rt-1',
  serviceType: 'streaming',
  recurringTransaction: mockRecurringTransaction,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSubscription2: Subscription = {
  id: 'sub-2',
  userId: 'user-1',
  recurringTransactionId: 'rt-2',
  serviceType: 'music',
  recurringTransaction: {
    ...mockRecurringTransaction,
    id: 'rt-2',
    description: 'Spotify',
    amount: 9.99,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStats: SubscriptionSummary = {
  monthlyTotal: 22.98,
  yearlyTotal: 275.76,
  activeCount: 2,
  nextRenewal: { description: 'Netflix', date: '2025-08-15', daysUntil: 5 },
};

const mockServiceTypeStats: ServiceTypeStat[] = [
  { serviceType: 'streaming', monthlyTotal: 12.99, count: 1 },
  { serviceType: 'music', monthlyTotal: 9.99, count: 1 },
];

describe('useSubscriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSubscriptionsCache();
  });

  it('fetches subscriptions on mount and sets them in state', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [mockSubscription] });

    const { result } = renderHook(() => useSubscriptions());

    expect(result.current.loading).toBe(true);
    expect(result.current.subscriptions).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.subscriptions).toEqual([mockSubscription]);
    expect(result.current.error).toBeNull();
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(mockedApi.get).toHaveBeenCalledWith('/subscriptions');
  });

  it('sets error state when initial fetch fails', async () => {
    mockedApi.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.subscriptions).toEqual([]);
  });

  it('uses cached data within TTL on subsequent mounts', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [mockSubscription] });

    const { result } = renderHook(() => useSubscriptions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedApi.get).toHaveBeenCalledTimes(1);

    const { result: result2 } = renderHook(() => useSubscriptions());
    await waitFor(() => expect(result2.current.loading).toBe(false));

    expect(result2.current.subscriptions).toEqual([mockSubscription]);
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
  });

  it('bypasses stale cache after resetCache', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [mockSubscription] });

    const { result } = renderHook(() => useSubscriptions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedApi.get.mockResolvedValue({ success: true, data: [mockSubscription, mockSubscription2] });

    act(() => {
      result.current.resetCache();
    });

    const { result: result2 } = renderHook(() => useSubscriptions());
    await waitFor(() => expect(result2.current.loading).toBe(false));

    expect(result2.current.subscriptions).toHaveLength(2);
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
  });

  it('fetchStats loads subscription summary', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [] });

    const { result } = renderHook(() => useSubscriptions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedApi.get.mockResolvedValue({ success: true, data: mockStats });

    await act(async () => {
      await result.current.fetchStats(2025, 8);
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/subscriptions/stats?year=2025&month=8');
    expect(result.current.stats).toEqual(mockStats);
  });

  it('fetchServiceTypes loads service type breakdown', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [] });

    const { result } = renderHook(() => useSubscriptions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedApi.get.mockResolvedValue({ success: true, data: mockServiceTypeStats });

    await act(async () => {
      await result.current.fetchServiceTypes();
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/subscriptions/service-types');
    expect(result.current.serviceTypeStats).toEqual(mockServiceTypeStats);
  });

  it('fetchServiceTypes passes year and month when provided', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [] });

    const { result } = renderHook(() => useSubscriptions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedApi.get.mockResolvedValue({ success: true, data: mockServiceTypeStats });

    await act(async () => {
      await result.current.fetchServiceTypes(2025, 8);
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/subscriptions/service-types?year=2025&month=8');
    expect(result.current.serviceTypeStats).toEqual(mockServiceTypeStats);
  });

  it('fetchUpcoming loads upcoming renewals', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [] });

    const { result } = renderHook(() => useSubscriptions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedApi.get.mockResolvedValue({ success: true, data: [mockSubscription] });

    await act(async () => {
      await result.current.fetchUpcoming('2025-08-01', '2025-08-31');
    });

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/subscriptions/upcoming?from=2025-08-01&to=2025-08-31',
    );
    expect(result.current.upcomingRenewals).toEqual([mockSubscription]);
  });

  it('handleCreate posts a new subscription and refetches', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [mockSubscription] });
    mockedApi.post.mockResolvedValue({ success: true, data: mockSubscription2 });

    const { result } = renderHook(() => useSubscriptions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedApi.get.mockResolvedValue({ success: true, data: [mockSubscription, mockSubscription2] });

    await act(async () => {
      await result.current.handleCreate({ recurringTransactionId: 'rt-2', serviceType: 'music' });
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/subscriptions', {
      recurringTransactionId: 'rt-2',
      serviceType: 'music',
    });
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
    expect(result.current.subscriptions).toHaveLength(2);
  });

  it('handleCreate sets error on failure', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [mockSubscription] });
    mockedApi.post.mockRejectedValue(new Error('Validation failed'));

    const { result } = renderHook(() => useSubscriptions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      try {
        await result.current.handleCreate({ recurringTransactionId: 'rt-2', serviceType: 'music' });
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBe('Validation failed');
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
  });

  it('handleUpdate patches a subscription and refetches', async () => {
    const updated = { ...mockSubscription, serviceType: 'other' as const };

    mockedApi.get.mockResolvedValue({ success: true, data: [mockSubscription] });
    mockedApi.patch.mockResolvedValue({ success: true, data: updated });

    const { result } = renderHook(() => useSubscriptions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedApi.get.mockResolvedValue({ success: true, data: [updated] });

    await act(async () => {
      await result.current.handleUpdate('sub-1', { serviceType: 'other' });
    });

    expect(mockedApi.patch).toHaveBeenCalledWith('/subscriptions/sub-1', { serviceType: 'other' });
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
    expect(result.current.subscriptions[0].serviceType).toBe('other');
  });

  it('handleDelete removes a subscription and refetches', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [mockSubscription, mockSubscription2] });
    mockedApi.delete.mockResolvedValue({ success: true, data: null });

    const { result } = renderHook(() => useSubscriptions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedApi.get.mockResolvedValue({ success: true, data: [mockSubscription2] });

    await act(async () => {
      await result.current.handleDelete('sub-1');
    });

    expect(mockedApi.delete).toHaveBeenCalledWith('/subscriptions/sub-1');
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
    expect(result.current.subscriptions).toEqual([mockSubscription2]);
  });
});
