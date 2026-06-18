import { renderHook, waitFor, act } from '@testing-library/react';
import { useCategories } from '../src/hooks/useCategories';
import { api } from '../src/lib/api';

jest.mock('../src/lib/api');
const mockedApi = api as jest.Mocked<typeof api>;

const mockCategories = [
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
  {
    id: 'cat-3',
    userId: 'user-1',
    name: 'Others',
    color: '#D1D5DB',
    type: 'expense' as const,
    isFallback: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('useCategories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and returns categories on mount', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: mockCategories });

    const { result } = renderHook(() => useCategories());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.categories).toEqual(mockCategories);
    expect(result.current.error).toBeNull();
  });

  it('sets error state when fetch fails', async () => {
    mockedApi.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.categories).toEqual([]);
  });

  it('creates a category and refreshes the list', async () => {
    const newCategory = {
      id: 'cat-new',
      userId: 'user-1',
      name: 'Groceries',
      color: '#FFE66D',
      type: 'expense' as const,
      isFallback: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedApi.get.mockResolvedValue({ success: true, data: mockCategories });
    mockedApi.post.mockResolvedValue({ success: true, data: newCategory });

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Set up the second get call for after creation
    mockedApi.get.mockResolvedValue({ success: true, data: [...mockCategories, newCategory] });

    let created: typeof newCategory | undefined;
    await act(async () => {
      created = await result.current.handleCreate('Groceries', 'expense', '#FFE66D');
    });

    expect(created).toEqual(newCategory);
    expect(mockedApi.post).toHaveBeenCalledWith('/categories', {
      name: 'Groceries',
      type: 'expense',
      color: '#FFE66D',
    });
    expect(result.current.categories).toHaveLength(4);
  });

  it('throws on duplicate category creation', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: mockCategories });
    mockedApi.post.mockRejectedValue(new Error('Category Food already exists'));

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      try {
        await result.current.handleCreate('Food', 'expense');
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBe('Category Food already exists');
  });

  it('updates a category and refreshes the list', async () => {
    const updated = { ...mockCategories[0], name: 'Dining Out' };
    mockedApi.get.mockResolvedValue({ success: true, data: mockCategories });
    mockedApi.patch.mockResolvedValue({ success: true, data: updated });

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedApi.get.mockResolvedValue({
      success: true,
      data: [updated, mockCategories[1], mockCategories[2]],
    });

    await act(async () => {
      await result.current.handleUpdate('cat-1', { name: 'Dining Out' });
    });

    expect(mockedApi.patch).toHaveBeenCalledWith('/categories/cat-1', { name: 'Dining Out' });
    expect(result.current.categories[0].name).toBe('Dining Out');
  });

  it('deletes a category and refreshes the list', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: mockCategories });
    mockedApi.delete.mockResolvedValue({ success: true, data: null });

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedApi.get.mockResolvedValue({
      success: true,
      data: [mockCategories[1], mockCategories[2]],
    });

    await act(async () => {
      await result.current.handleDelete('cat-1');
    });

    expect(mockedApi.delete).toHaveBeenCalledWith('/categories/cat-1');
    expect(result.current.categories).toHaveLength(2);
  });

  it('throws on delete fallback category', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: mockCategories });
    mockedApi.delete.mockRejectedValue(new Error('Cannot delete fallback category'));

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      try {
        await result.current.handleDelete('cat-3');
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBe('Cannot delete fallback category');
  });
});
