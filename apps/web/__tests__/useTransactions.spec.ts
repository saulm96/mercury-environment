import { renderHook, waitFor, act } from '@testing-library/react';
import { useTransactions } from '../src/hooks/useTransactions';
import { useCategories } from '../src/hooks/useCategories';
import { api } from '../src/lib/api';
import type { Transaction, Category } from '@mercury/shared';

jest.mock('../src/lib/api');
jest.mock('../src/hooks/useCategories', () => ({
  useCategories: jest.fn(),
}));

const mockedApi = api as jest.Mocked<typeof api>;

/* ------------------------------------------------------------------ */
/*  Mock data factories                                                */
/* ------------------------------------------------------------------ */

const mockTransaction: Transaction = {
  id: 'tx-1',
  userId: 'user-1',
  type: 'expense' as const,
  amount: 42.99,
  description: 'Groceries',
  date: '2025-01-15',
  categoryId: 'cat-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTransaction2: Transaction = {
  id: 'tx-2',
  userId: 'user-1',
  type: 'income' as const,
  amount: 3000,
  description: 'Salary',
  date: '2025-01-01',
  categoryId: 'cat-2',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Food',
    color: '#FF6B6B',
    type: 'expense' as const,
    isFallback: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'cat-2',
    userId: 'user-1',
    name: 'Salary',
    color: '#4ECDC4',
    type: 'income' as const,
    isFallback: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/* ------------------------------------------------------------------ */
/*  Shared mock helpers for useCategories                              */
/* ------------------------------------------------------------------ */

const mockHandleCreateCategory = jest.fn();
const mockHandleDeleteCategory = jest.fn();

function setupUseCategoriesMock(overrides: Partial<{
  categories: Category[];
  loading: boolean;
}> = {}) {
  (useCategories as jest.Mock).mockReturnValue({
    categories: overrides.categories ?? mockCategories,
    loading: overrides.loading ?? false,
    handleCreate: mockHandleCreateCategory,
    handleDelete: mockHandleDeleteCategory,
  });
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('useTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupUseCategoriesMock();
  });

  /* ---------------------------------------------------------------- */
  /*  1. Initial fetch on mount                                        */
  /* ---------------------------------------------------------------- */

  it('fetches transactions on mount and sets them in state', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [mockTransaction] });

    const { result } = renderHook(() => useTransactions());

    // Loading should be true immediately after render (before async fetch resolves)
    expect(result.current.loading).toBe(true);
    expect(result.current.transactions).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.transactions).toEqual([mockTransaction]);
    expect(result.current.error).toBeNull();
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(mockedApi.get).toHaveBeenCalledWith('/transactions');
  });

  /* ---------------------------------------------------------------- */
  /*  2. Error state on initial fetch failure                          */
  /* ---------------------------------------------------------------- */

  it('sets error state when initial fetch fails', async () => {
    mockedApi.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.transactions).toEqual([]);
  });

  /* ---------------------------------------------------------------- */
  /*  3. handleCreate – success path                                   */
  /* ---------------------------------------------------------------- */

  it('handleCreate posts a new transaction, refetches, and closes modal', async () => {
    const newTransaction: Transaction = {
      id: 'tx-3',
      userId: 'user-1',
      type: 'expense' as const,
      amount: 15.5,
      description: 'Lunch',
      date: '2025-01-16',
      categoryId: 'cat-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Initial fetch
    mockedApi.get.mockResolvedValue({ success: true, data: [mockTransaction] });
    mockedApi.post.mockResolvedValue({ success: true, data: newTransaction });

    const { result } = renderHook(() => useTransactions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedApi.get).toHaveBeenCalledTimes(1);

    // Prepare api.get for the refetch triggered inside handleCreate
    mockedApi.get.mockResolvedValue({
      success: true,
      data: [mockTransaction, newTransaction],
    });

    await act(async () => {
      await result.current.handleCreate({
        type: 'expense',
        amount: 15.5,
        description: 'Lunch',
        date: '2025-01-16',
        categoryId: 'cat-1',
      });
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/transactions', {
      type: 'expense',
      amount: 15.5,
      description: 'Lunch',
      date: '2025-01-16',
      categoryId: 'cat-1',
    });
    expect(mockedApi.get).toHaveBeenCalledTimes(2); // initial + refetch
    expect(result.current.modal.open).toBe(false);
    expect(result.current.modal.transaction).toBeUndefined();
    expect(result.current.transactions).toHaveLength(2);
    expect(result.current.transactions).toEqual([mockTransaction, newTransaction]);
  });

  /* ---------------------------------------------------------------- */
  /*  4. handleCreate – error path                                     */
  /* ---------------------------------------------------------------- */

  it('handleCreate sets error on failure', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [mockTransaction] });
    mockedApi.post.mockRejectedValue(new Error('Validation failed'));

    const { result } = renderHook(() => useTransactions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      try {
        await result.current.handleCreate({
          type: 'expense',
          amount: -10,
          description: 'Bad data',
          date: 'invalid',
        });
      } catch {
        // expected – handleCreate re-throws after setting error
      }
    });

    expect(result.current.error).toBe('Validation failed');
    // fetchTransactions should NOT have been called again (only initial mount)
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
  });

  /* ---------------------------------------------------------------- */
  /*  5. handleUpdate – success path                                   */
  /* ---------------------------------------------------------------- */

  it('handleUpdate patches a transaction, refetches, and closes modal', async () => {
    const updatedTx = { ...mockTransaction, amount: 55.0, description: 'Updated Groceries' };

    mockedApi.get.mockResolvedValue({ success: true, data: [mockTransaction] });
    mockedApi.patch.mockResolvedValue({ success: true, data: updatedTx });

    const { result } = renderHook(() => useTransactions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Prepare api.get for refetch
    mockedApi.get.mockResolvedValue({ success: true, data: [updatedTx] });

    await act(async () => {
      await result.current.handleUpdate('tx-1', {
        type: 'expense',
        amount: 55.0,
        description: 'Updated Groceries',
        date: '2025-01-15',
        categoryId: 'cat-1',
      });
    });

    expect(mockedApi.patch).toHaveBeenCalledWith('/transactions/tx-1', {
      type: 'expense',
      amount: 55.0,
      description: 'Updated Groceries',
      date: '2025-01-15',
      categoryId: 'cat-1',
    });
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
    expect(result.current.modal.open).toBe(false);
    expect(result.current.transactions[0].amount).toBe(55.0);
    expect(result.current.transactions[0].description).toBe('Updated Groceries');
  });

  /* ---------------------------------------------------------------- */
  /*  6. handleUpdate – error path                                     */
  /* ---------------------------------------------------------------- */

  it('handleUpdate sets error on failure', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [mockTransaction] });
    mockedApi.patch.mockRejectedValue(new Error('Transaction not found'));

    const { result } = renderHook(() => useTransactions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      try {
        await result.current.handleUpdate('nonexistent', {
          type: 'expense',
          amount: 100,
          description: 'Ghost',
          date: '2025-01-01',
        });
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBe('Transaction not found');
    expect(mockedApi.get).toHaveBeenCalledTimes(1); // only the initial mount
  });

  /* ---------------------------------------------------------------- */
  /*  7. openCreateModal – opens without transaction                   */
  /* ---------------------------------------------------------------- */

  it('openCreateModal sets modal open without transaction', () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [] });
    const { result } = renderHook(() => useTransactions());

    // Initial modal state is closed
    expect(result.current.modal.open).toBe(false);

    act(() => {
      result.current.openCreateModal();
    });

    expect(result.current.modal.open).toBe(true);
    expect(result.current.modal.transaction).toBeUndefined();
  });

  /* ---------------------------------------------------------------- */
  /*  8. openEditModal – opens with the given transaction              */
  /* ---------------------------------------------------------------- */

  it('openEditModal sets modal open with the given transaction', () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [] });
    const { result } = renderHook(() => useTransactions());

    act(() => {
      result.current.openEditModal(mockTransaction);
    });

    expect(result.current.modal.open).toBe(true);
    expect(result.current.modal.transaction).toEqual(mockTransaction);
  });

  /* ---------------------------------------------------------------- */
  /*  9. closeModal – closes the modal                                 */
  /* ---------------------------------------------------------------- */

  it('closeModal sets modal open to false', () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [] });
    const { result } = renderHook(() => useTransactions());

    // Open modal first
    act(() => {
      result.current.openCreateModal();
    });
    expect(result.current.modal.open).toBe(true);

    // Now close it
    act(() => {
      result.current.closeModal();
    });
    expect(result.current.modal.open).toBe(false);
  });

  /* ---------------------------------------------------------------- */
  /*  10. handleDeleteCategory delegates to useCategories and refetches*/
  /* ---------------------------------------------------------------- */

  it('handleDeleteCategory calls useCategories handleDelete and refetches transactions', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [mockTransaction, mockTransaction2] });

    const { result } = renderHook(() => useTransactions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Prepare api.get for the refetch after delete
    mockedApi.get.mockResolvedValue({ success: true, data: [mockTransaction2] });

    await act(async () => {
      await result.current.handleDeleteCategory('cat-1');
    });

    // Should delegate to the mocked useCategories handleDelete
    expect(mockHandleDeleteCategory).toHaveBeenCalledWith('cat-1');
    expect(mockHandleDeleteCategory).toHaveBeenCalledTimes(1);

    // Should refetch transactions
    expect(mockedApi.get).toHaveBeenCalledTimes(2); // initial + refetch
    expect(result.current.transactions).toEqual([mockTransaction2]);
  });

  /* ---------------------------------------------------------------- */
  /*  11. exposes categories from useCategories                        */
  /* ---------------------------------------------------------------- */

  it('exposes categories and categoriesLoading from useCategories', () => {
    const customCategories: Category[] = [mockCategories[0]];
    setupUseCategoriesMock({ categories: customCategories, loading: true });

    mockedApi.get.mockResolvedValue({ success: true, data: [] });
    const { result } = renderHook(() => useTransactions());

    // categoriesLoading is the loading from useCategories
    expect(result.current.categoriesLoading).toBe(true);
    expect(result.current.categories).toEqual(customCategories);
  });

  /* ---------------------------------------------------------------- */
  /*  12. handleCreateCategory delegates to useCategories handleCreate */
  /* ---------------------------------------------------------------- */

  it('handleCreateCategory delegates to useCategories handleCreate', async () => {
    const createdCategory: Category = {
      id: 'cat-new',
      userId: 'user-1',
      name: 'Entertainment',
      color: '#FFE66D',
      type: 'expense' as const,
      isFallback: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockHandleCreateCategory.mockResolvedValue(createdCategory);
    mockedApi.get.mockResolvedValue({ success: true, data: [mockTransaction] });

    const { result } = renderHook(() => useTransactions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returnedCategory: Category | undefined;
    await act(async () => {
      returnedCategory = await result.current.handleCreateCategory('Entertainment', 'expense', '#FFE66D');
    });

    expect(mockHandleCreateCategory).toHaveBeenCalledWith('Entertainment', 'expense', '#FFE66D');
    expect(mockHandleCreateCategory).toHaveBeenCalledTimes(1);
    expect(returnedCategory).toEqual(createdCategory);
  });
});
