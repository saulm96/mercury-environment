'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Category, ApiResponse } from '@mercury/shared';

interface UseCategoriesReturn {
  categories: Category[];
  loading: boolean;
  error: string | null;
  handleCreate: (name: string, type: 'income' | 'expense', color?: string) => Promise<Category>;
  handleUpdate: (id: string, data: { name?: string; color?: string }) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ApiResponse<Category[]>>('/categories');
      setCategories(response.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreate = useCallback(
    async (name: string, type: 'income' | 'expense', color?: string): Promise<Category> => {
      setError(null);
      try {
        const response = await api.post<ApiResponse<Category>>('/categories', { name, type, color });
        await fetchCategories();
        return response.data!;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [fetchCategories],
  );

  const handleUpdate = useCallback(
    async (id: string, data: { name?: string; color?: string }) => {
      setError(null);
      try {
        await api.patch<ApiResponse<Category>>(`/categories/${id}`, data);
        await fetchCategories();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [fetchCategories],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await api.delete<ApiResponse<null>>(`/categories/${id}`);
        await fetchCategories();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [fetchCategories],
  );

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    handleCreate,
    handleUpdate,
    handleDelete,
  };
}
