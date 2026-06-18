'use client';

import { useEffect } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionCardList } from '@/components/transactions/TransactionCardList';
import { TransactionModal } from '@/components/transactions/TransactionModal';

export default function TransactionsPage() {
  const {
    transactions,
    loading,
    error,
    modal,
    fetchTransactions,
    handleCreate,
    handleUpdate,
    openCreateModal,
    openEditModal,
    closeModal,
  } = useTransactions();

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <main className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading text-mercury-text">Transactions</h1>
        <button
          onClick={openCreateModal}
          className="bg-mercury-cta text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 hover:opacity-90 hover:-translate-y-px cursor-pointer"
        >
          New Transaction
        </button>
      </div>

      {/* Transaction list */}
      <TransactionCardList
        transactions={transactions}
        loading={loading}
        error={error}
        onEdit={openEditModal}
        onCreateClick={openCreateModal}
      />

      {/* Modal */}
      <TransactionModal
        isOpen={modal.open}
        transaction={modal.transaction}
        onClose={closeModal}
        onSubmit={
          modal.transaction
            ? (data) => handleUpdate(modal.transaction!.id, data)
            : handleCreate
        }
      />
    </main>
  );
}
