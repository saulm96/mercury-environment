'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { RecurringTransaction, ApiResponse } from '@mercury/shared';
import type { RecurringTransactionFormData } from '@/components/transactions/RecurringTransactionForm';

interface UseRecurringTransactionsReturn {
  recurringTransactions: RecurringTransaction[];
  loading: boolean;
  error: string | null;
  fetchRecurringTransactions: () => Promise<void>;
  processDue: () => Promise<{ generated: number; errors: string[] }>;
  handleCreate: (data: RecurringTransactionFormData) => Promise<void>;
  handleUpdate: (id: string, data: RecurringTransactionFormData) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleSkip: (id: string, occurrenceDate: string) => Promise<void>;
  handleUnskip: (id: string, occurrenceDate: string) => Promise<void>;
  resetCache: () => void;
}

let cachedRecurringTransactions: RecurringTransaction[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30_000;

export function resetRecurringTransactionsCache() {
  cachedRecurringTransactions = null;
  cacheTimestamp = 0;
}

export function useRecurringTransactions(): UseRecurringTransactionsReturn {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecurringTransactions = useCallback(async () => {
    const now = Date.now();
    if (cachedRecurringTransactions !== null && now - cacheTimestamp < CACHE_TTL) {
      setRecurringTransactions(cachedRecurringTransactions);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ApiResponse<RecurringTransaction[]>>('/recurring-transactions');
      const data = response.data ?? [];
      cachedRecurringTransactions = data;
      cacheTimestamp = Date.now();
      setRecurringTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const processDue = useCallback(async (): Promise<{ generated: number; errors: string[] }> => {
    setError(null);
    try {
      const response = await api.post<ApiResponse<{ generated: number; errors: string[] }>>(
        '/recurring-transactions/process-due',
        {},
      );
      return response.data ?? { generated: 0, errors: [] };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    }
  }, []);

  const handleCreate = useCallback(
    async (data: RecurringTransactionFormData) => {
      setError(null);
      try {
        await api.post<ApiResponse<RecurringTransaction>>('/recurring-transactions', data);
        resetRecurringTransactionsCache();
        await fetchRecurringTransactions();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [fetchRecurringTransactions],
  );

  const handleUpdate = useCallback(
    async (id: string, data: RecurringTransactionFormData) => {
      setError(null);
      try {
        await api.patch<ApiResponse<RecurringTransaction>>(`/recurring-transactions/${id}`, data);
        resetRecurringTransactionsCache();
        await fetchRecurringTransactions();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [fetchRecurringTransactions],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await api.delete<ApiResponse<null>>(`/recurring-transactions/${id}`);
        resetRecurringTransactionsCache();
        await fetchRecurringTransactions();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [fetchRecurringTransactions],
  );

  const handleSkip = useCallback(
    async (id: string, occurrenceDate: string) => {
      setError(null);
      try {
        await api.post<ApiResponse<null>>(`/recurring-transactions/${id}/skip`, { occurrenceDate });
        resetRecurringTransactionsCache();
        await fetchRecurringTransactions();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [fetchRecurringTransactions],
  );

  const handleUnskip = useCallback(
    async (id: string, occurrenceDate: string) => {
      setError(null);
      try {
        await api.delete<ApiResponse<null>>(
          `/recurring-transactions/${id}/skip?occurrenceDate=${encodeURIComponent(occurrenceDate)}`,
        );
        resetRecurringTransactionsCache();
        await fetchRecurringTransactions();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [fetchRecurringTransactions],
  );

  const resetCache = useCallback(() => {
    resetRecurringTransactionsCache();
  }, []);

  useEffect(() => {
    fetchRecurringTransactions();
  }, [fetchRecurringTransactions]);

  return {
    recurringTransactions,
    loading,
    error,
    fetchRecurringTransactions,
    processDue,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleSkip,
    handleUnskip,
    resetCache,
  };
}
