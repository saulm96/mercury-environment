'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionCardList } from '@/components/transactions/TransactionCardList';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { CategoryManager } from '@/components/categories/CategoryManager';

export default function TransactionsPage() {
  const {
    transactions,
    loading,
    error,
    modal,
    categories,
    fetchTransactions,
    handleCreate,
    handleUpdate,
    handleCreateCategory,
    handleDeleteCategory,
    openCreateModal,
    openEditModal,
    closeModal,
  } = useTransactions();

  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const transactionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of transactions) {
      if (t.categoryId) {
        counts[t.categoryId] = (counts[t.categoryId] ?? 0) + 1;
      }
    }
    return counts;
  }, [transactions]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <main className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading text-mercury-text">Transactions</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCategoryManager(true)}
            className="p-2.5 rounded-lg border-2 border-mercury-primary text-mercury-primary transition-all duration-200 hover:bg-mercury-primary hover:text-white cursor-pointer"
            aria-label="Manage Categories"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
          <button
            onClick={openCreateModal}
            className="bg-mercury-cta text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 hover:opacity-90 hover:-translate-y-px cursor-pointer"
          >
            New Transaction
          </button>
        </div>
      </div>

      {/* Transaction list */}
      <TransactionCardList
        transactions={transactions}
        loading={loading}
        error={error}
        onEdit={openEditModal}
        onCreateClick={openCreateModal}
      />

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={modal.open}
        transaction={modal.transaction}
        categories={categories}
        onCreateCategory={handleCreateCategory}
        onClose={closeModal}
        onSubmit={
          modal.transaction
            ? (data) => handleUpdate(modal.transaction!.id, data)
            : handleCreate
        }
      />

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowCategoryManager(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Manage Categories"
        >
          <div
            className="bg-white rounded-modal p-8 shadow-mercury-xl max-w-[700px] w-full max-h-[90vh] overflow-y-auto transition-all duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-heading text-mercury-text">Manage Categories</h2>
              <button
                onClick={() => setShowCategoryManager(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-mercury-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <CategoryManager
              categories={categories}
              transactionCounts={transactionCounts}
              onCreateCategory={handleCreateCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          </div>
        </div>
      )}
    </main>
  );
}
