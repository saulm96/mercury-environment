import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useRecurringTransactions,
  resetRecurringTransactionsCache,
} from '../../src/hooks/useRecurringTransactions';
import { api } from '../../src/lib/api';
import type { RecurringTransaction } from '@mercury/shared';

jest.mock('../../src/lib/api');

const mockedApi = api as jest.Mocked<typeof api>;

const mockRecurring: RecurringTransaction = {
  id: 'rt-1',
  userId: 'user-1',
  type: 'expense' as const,
  amount: 100,
  description: 'Rent',
  frequency: 'monthly' as const,
  interval: 1,
  startDate: '2025-01-01',
  endDate: null,
  nextDate: '2025-08-01',
  dayOfMonth: 1,
  dayOfWeek: null,
  categoryId: 'cat-1',
  status: 'active' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRecurring2: RecurringTransaction = {
  id: 'rt-2',
  userId: 'user-1',
  type: 'income' as const,
  amount: 2500,
  description: 'Salary',
  frequency: 'monthly' as const,
  interval: 1,
  startDate: '2025-01-15',
  endDate: null,
  nextDate: '2025-08-15',
  dayOfMonth: 15,
  dayOfWeek: null,
  categoryId: null,
  status: 'active' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('useRecurringTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRecurringTransactionsCache();
  });

  it('fetches recurring transactions on mount and sets them in state', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [mockRecurring] });

    const { result } = renderHook(() => useRecurringTransactions());

    expect(result.current.loading).toBe(true);
    expect(result.current.recurringTransactions).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.recurringTransactions).toEqual([mockRecurring]);
    expect(result.current.error).toBeNull();
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(mockedApi.get).toHaveBeenCalledWith('/recurring-transactions');
  });

  it('sets error state when initial fetch fails', async () => {
    mockedApi.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useRecurringTransactions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.recurringTransactions).toEqual([]);
  });

  it('uses cached data within TTL on subsequent mounts', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [mockRecurring] });

    const { result } = renderHook(() => useRecurringTransactions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedApi.get).toHaveBeenCalledTimes(1);

    const { result: result2 } = renderHook(() => useRecurringTransactions());
    await waitFor(() => expect(result2.current.loading).toBe(false));

    expect(result2.current.recurringTransactions).toEqual([mockRecurring]);
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
  });

  it('bypasses stale cache after resetCache', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [mockRecurring] });

    const { result } = renderHook(() => useRecurringTransactions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedApi.get.mockResolvedValue({ success: true, data: [mockRecurring, mockRecurring2] });

    act(() => {
      result.current.resetCache();
    });

    const { result: result2 } = renderHook(() => useRecurringTransactions());
    await waitFor(() => expect(result2.current.loading).toBe(false));

    expect(result2.current.recurringTransactions).toHaveLength(2);
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
  });

  it('processDue posts to process-due and returns generated count', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [] });
    mockedApi.post.mockResolvedValue({ success: true, data: { generated: 3, errors: [] } });

    const { result } = renderHook(() => useRecurringTransactions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { generated: number; errors: string[] } | undefined;
    await act(async () => {
      response = await result.current.processDue();
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/recurring-transactions/process-due', {});
    expect(response).toEqual({ generated: 3, errors: [] });
  });

  it('processDue sets error on failure', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [] });
    mockedApi.post.mockRejectedValue(new Error('Processing failed'));

    const { result } = renderHook(() => useRecurringTransactions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      try {
        await result.current.processDue();
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBe('Processing failed');
  });

  it('handleCreate posts a new recurring transaction and refetches', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [mockRecurring] });
    mockedApi.post.mockResolvedValue({ success: true, data: mockRecurring2 });

    const { result } = renderHook(() => useRecurringTransactions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedApi.get.mockResolvedValue({ success: true, data: [mockRecurring, mockRecurring2] });

    await act(async () => {
      await result.current.handleCreate({
        type: 'income',
        amount: 2500,
        description: 'Salary',
        date: '2025-01-15',
        frequency: 'monthly',
        interval: 1,
        dayOfMonth: 15,
      });
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/recurring-transactions', {
      type: 'income',
      amount: 2500,
      description: 'Salary',
      date: '2025-01-15',
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 15,
    });
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
    expect(result.current.recurringTransactions).toHaveLength(2);
  });

  it('handleCreate sets error on failure', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [mockRecurring] });
    mockedApi.post.mockRejectedValue(new Error('Validation failed'));

    const { result } = renderHook(() => useRecurringTransactions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      try {
        await result.current.handleCreate({
          type: 'expense',
          amount: 100,
          description: 'Rent',
          date: '2025-01-01',
          frequency: 'monthly',
          interval: 1,
        });
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBe('Validation failed');
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
  });

  it('handleUpdate patches a recurring transaction and refetches', async () => {
    const updated = { ...mockRecurring, amount: 1100, description: 'Updated Rent' };

    mockedApi.get.mockResolvedValue({ success: true, data: [mockRecurring] });
    mockedApi.patch.mockResolvedValue({ success: true, data: updated });

    const { result } = renderHook(() => useRecurringTransactions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedApi.get.mockResolvedValue({ success: true, data: [updated] });

    await act(async () => {
      await result.current.handleUpdate('rt-1', {
        type: 'expense',
        amount: 1100,
        description: 'Updated Rent',
        date: '2025-01-01',
        frequency: 'monthly',
        interval: 1,
        dayOfMonth: 1,
      });
    });

    expect(mockedApi.patch).toHaveBeenCalledWith('/recurring-transactions/rt-1', {
      type: 'expense',
      amount: 1100,
      description: 'Updated Rent',
      date: '2025-01-01',
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 1,
    });
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
    expect(result.current.recurringTransactions[0].amount).toBe(1100);
  });

  it('handleDelete removes a recurring transaction and refetches', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [mockRecurring, mockRecurring2] });
    mockedApi.delete.mockResolvedValue({ success: true, data: null });

    const { result } = renderHook(() => useRecurringTransactions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedApi.get.mockResolvedValue({ success: true, data: [mockRecurring2] });

    await act(async () => {
      await result.current.handleDelete('rt-1');
    });

    expect(mockedApi.delete).toHaveBeenCalledWith('/recurring-transactions/rt-1');
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
    expect(result.current.recurringTransactions).toEqual([mockRecurring2]);
  });

  it('handleSkip posts a skip and refetches', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [mockRecurring] });
    mockedApi.post.mockResolvedValue({ success: true, data: null });

    const { result } = renderHook(() => useRecurringTransactions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleSkip('rt-1', '2025-08-01');
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/recurring-transactions/rt-1/skip', {
      occurrenceDate: '2025-08-01',
    });
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
  });

  it('handleUnskip deletes a skip and refetches', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [mockRecurring] });
    mockedApi.delete.mockResolvedValue({ success: true, data: null });

    const { result } = renderHook(() => useRecurringTransactions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleUnskip('rt-1', '2025-08-01');
    });

    expect(mockedApi.delete).toHaveBeenCalledWith(
      '/recurring-transactions/rt-1/skip?occurrenceDate=2025-08-01',
    );
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
  });
});
