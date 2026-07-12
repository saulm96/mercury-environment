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

let cachedCategories: Category[] | null = null;
let categoriesCacheTs = 0;
const CATEGORIES_CACHE_TTL = 60_000;

export function resetCategoriesCache() {
  cachedCategories = null;
  categoriesCacheTs = 0;
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    const now = Date.now();
    if (cachedCategories !== null && now - categoriesCacheTs < CATEGORIES_CACHE_TTL) {
      setCategories(cachedCategories);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ApiResponse<Category[]>>('/categories');
      const data = response.data ?? [];
      cachedCategories = data;
      categoriesCacheTs = Date.now();
      setCategories(data);
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
        cachedCategories = null;
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
        cachedCategories = null;
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
        cachedCategories = null;
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
