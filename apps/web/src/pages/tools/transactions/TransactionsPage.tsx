import { useEffect, useState, useMemo } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionCardList } from '@/components/transactions/TransactionCardList';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { CategoryManager } from '@/components/categories/CategoryManager';
import { BulletListIcon, CloseIcon } from '@/components/icons';
import styles from './TransactionsPage.module.css';

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
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Transactions</h1>
        <div className={styles.actions}>
          <button
            onClick={() => setShowCategoryManager(true)}
            className={styles.categoryButton}
            aria-label="Manage Categories"
          >
            <BulletListIcon />
          </button>
          <button onClick={openCreateModal} className={styles.createButton}>
            New Transaction
          </button>
        </div>
      </div>

      <TransactionCardList
        transactions={transactions}
        loading={loading}
        error={error}
        onEdit={openEditModal}
        onCreateClick={openCreateModal}
      />

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

      {showCategoryManager && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowCategoryManager(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Manage Categories"
        >
          <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalHeading}>Manage Categories</h2>
              <button
                onClick={() => setShowCategoryManager(false)}
                className={styles.closeButton}
                aria-label="Close"
              >
                <CloseIcon className="w-5 h-5 text-mercury-secondary" />
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
