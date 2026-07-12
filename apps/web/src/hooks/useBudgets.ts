'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Budget, BudgetStats, BudgetStat, ApiResponse } from '@mercury/shared';

interface CreateBudgetData {
  name: string;
  value: number;
  period: 'monthly';
  categoryIds: string[];
}

interface UpdateBudgetData {
  name?: string;
  value?: number;
  categoryIds?: string[];
}

interface UseBudgetsReturn {
  budgets: Budget[];
  stats: BudgetStats | null;
  loading: boolean;
  error: string | null;
  fetchBudgets: () => Promise<void>;
  fetchStats: (year: number, month: number) => Promise<void>;
  handleCreate: (data: CreateBudgetData) => Promise<Budget>;
  handleUpdate: (id: string, data: UpdateBudgetData) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
}

let cachedBudgets: Budget[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30_000;

export function resetBudgetsCache() {
  cachedBudgets = null;
  cacheTimestamp = 0;
}

export function useBudgets(): UseBudgetsReturn {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [stats, setStats] = useState<BudgetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = useCallback(async () => {
    const now = Date.now();
    if (cachedBudgets !== null && now - cacheTimestamp < CACHE_TTL) {
      setBudgets(cachedBudgets);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ApiResponse<Budget[]>>('/budgets');
      const raw = response.data ?? [];
      const parsed = raw.map((b) => ({ ...b, value: Number(b.value) }));
      cachedBudgets = parsed;
      cacheTimestamp = Date.now();
      setBudgets(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async (year: number, month: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ApiResponse<BudgetStats>>(`/budgets/stats?year=${year}&month=${month}`);
      const data = response.data;
      setStats(data ? {
        ...data,
        totalIncome: Number(data.totalIncome),
        totalExpenses: Number(data.totalExpenses),
        totalAllocated: Number(data.totalAllocated),
        estimatedSavings: Number(data.estimatedSavings),
        actualSavings: Number(data.actualSavings),
      } : null);
      setBudgets(data?.budgets?.map((stat: BudgetStat) => ({
        id: stat.id,
        userId: '',
        name: stat.name,
        value: Number(stat.value),
        period: 'monthly' as const,
        categories: stat.categories,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreate = useCallback(
    async (data: CreateBudgetData): Promise<Budget> => {
      setError(null);
      try {
        const response = await api.post<ApiResponse<Budget>>('/budgets', data);
        cachedBudgets = null;
        await fetchBudgets();
        return response.data!;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [fetchBudgets],
  );

  const handleUpdate = useCallback(
    async (id: string, data: UpdateBudgetData) => {
      setError(null);
      try {
        await api.patch<ApiResponse<Budget>>(`/budgets/${id}`, data);
        cachedBudgets = null;
        await fetchBudgets();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [fetchBudgets],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await api.delete<ApiResponse<null>>(`/budgets/${id}`);
        cachedBudgets = null;
        await fetchBudgets();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [fetchBudgets],
  );

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  return {
    budgets,
    stats,
    loading,
    error,
    fetchBudgets,
    fetchStats,
    handleCreate,
    handleUpdate,
    handleDelete,
  };
}
