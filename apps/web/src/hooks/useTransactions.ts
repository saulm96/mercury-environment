'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Transaction, Category, ApiResponse } from '@mercury/shared';
import { useCategories } from './useCategories';

interface TransactionFormData {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  categoryId?: string;
}

interface ModalState {
  open: boolean;
  transaction?: Transaction;
}

interface UseTransactionsReturn {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  modal: ModalState;
  categories: Category[];
  categoriesLoading: boolean;
  fetchTransactions: () => Promise<void>;
  handleCreate: (data: TransactionFormData) => Promise<void>;
  handleUpdate: (id: string, data: TransactionFormData) => Promise<void>;
  handleCreateCategory: (name: string, type: 'income' | 'expense', color?: string) => Promise<Category>;
  openCreateModal: () => void;
  openEditModal: (tx: Transaction) => void;
  closeModal: () => void;
}

export function useTransactions(): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const {
    categories,
    loading: categoriesLoading,
    handleCreate: handleCreateCategory,
  } = useCategories();

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ApiResponse<Transaction[]>>('/transactions');
      setTransactions(response.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreate = useCallback(
    async (data: TransactionFormData) => {
      setError(null);
      try {
        await api.post<ApiResponse<Transaction>>('/transactions', data);
        await fetchTransactions();
        setModal({ open: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [fetchTransactions],
  );

  const handleUpdate = useCallback(
    async (id: string, data: TransactionFormData) => {
      setError(null);
      try {
        await api.patch<ApiResponse<Transaction>>(`/transactions/${id}`, data);
        await fetchTransactions();
        setModal({ open: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [fetchTransactions],
  );

  const openCreateModal = useCallback(() => {
    setModal({ open: true });
  }, []);

  const openEditModal = useCallback((tx: Transaction) => {
    setModal({ open: true, transaction: tx });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ open: false });
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    modal,
    categories,
    categoriesLoading,
    fetchTransactions,
    handleCreate,
    handleUpdate,
    handleCreateCategory,
    openCreateModal,
    openEditModal,
    closeModal,
  };
}
