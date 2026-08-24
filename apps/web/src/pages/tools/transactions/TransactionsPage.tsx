import { useState, useMemo } from 'react';
import type { Transaction, RecurringTransaction } from '@mercury/shared';
import { useTransactions } from '@/hooks/useTransactions';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useRecurringSync } from '@/components/transactions/RecurringSyncProvider';
import { TransactionCardList } from '@/components/transactions/TransactionCardList';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { RecurringTransactionForm } from '@/components/transactions/RecurringTransactionForm';
import type { RecurringTransactionFormData } from '@/components/transactions/RecurringTransactionForm';
import type { TransactionFormData } from '@/components/transactions/TransactionForm';
import { CategoryManager } from '@/components/categories/CategoryManager';
import { BulletListIcon, CloseIcon } from '@/components/icons';
import TransactionsSkeleton from './TransactionsSkeleton';
import styles from './TransactionsPage.module.css';

function mapRecurringToFormValues(
  recurring: RecurringTransaction,
): Partial<RecurringTransactionFormData> {
  return {
    type: recurring.type,
    amount: recurring.amount,
    description: recurring.description,
    date: recurring.startDate,
    frequency: recurring.frequency,
    interval: recurring.interval,
    endDate: recurring.endDate ?? undefined,
    dayOfMonth: recurring.dayOfMonth ?? undefined,
    dayOfWeek: recurring.dayOfWeek ?? undefined,
    categoryId: recurring.categoryId ?? undefined,
  };
}

export default function TransactionsPage() {
  const { ready } = useRecurringSync();
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
  } = useTransactions(ready);

  const {
    recurringTransactions,
    handleCreate: handleCreateRecurring,
    handleUpdate: handleUpdateRecurring,
    handleDelete: handleDeleteRecurring,
    processDue,
  } = useRecurringTransactions();

  const { handleCreate: handleCreateSubscription } = useSubscriptions();

  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingSeries, setEditingSeries] = useState<RecurringTransaction | null>(null);
  const [isDeletingSeries, setIsDeletingSeries] = useState(false);

  const transactionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of transactions) {
      if (t.categoryId) {
        counts[t.categoryId] = (counts[t.categoryId] ?? 0) + 1;
      }
    }
    return counts;
  }, [transactions]);

  async function handleCreateTransaction(data: TransactionFormData) {
    if (!data.isRecurring) {
      await handleCreate(data);
      return;
    }

    const recurringData: RecurringTransactionFormData = {
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: data.date,
      frequency: data.frequency!,
      interval: data.interval ?? 1,
      categoryId: data.categoryId,
    };

    if (data.endDate) {
      recurringData.endDate = data.endDate;
    }
    if (data.frequency === 'monthly' && data.dayOfMonth) {
      recurringData.dayOfMonth = data.dayOfMonth;
    }
    if (data.frequency === 'weekly' && data.dayOfWeek !== undefined) {
      recurringData.dayOfWeek = data.dayOfWeek;
    }

    const created = await handleCreateRecurring(recurringData);
    await processDue();
    await fetchTransactions();

    if (data.isSubscription && data.serviceType) {
      await handleCreateSubscription({
        recurringTransactionId: created.id,
        serviceType: data.serviceType,
      });
    }

    closeModal();
  }

  function handleEditSeries(tx: { recurringTransactionId: string | null }) {
    if (!tx.recurringTransactionId) return;
    const recurring = recurringTransactions.find((r) => r.id === tx.recurringTransactionId);
    if (!recurring) return;
    setEditingSeries(recurring);
  }

  function handleEditSeriesFromModal(transaction: Transaction) {
    closeModal();
    handleEditSeries(transaction);
  }

  async function handleUpdateSeries(data: RecurringTransactionFormData) {
    if (!editingSeries) return;
    await handleUpdateRecurring(editingSeries.id, data);
    await fetchTransactions();
    setEditingSeries(null);
  }

  async function handleDeleteSeries() {
    if (!editingSeries) return;
    setIsDeletingSeries(true);
    try {
      await handleDeleteRecurring(editingSeries.id);
      await fetchTransactions();
      setEditingSeries(null);
    } finally {
      setIsDeletingSeries(false);
    }
  }

  if (!ready) {
    return <TransactionsSkeleton />;
  }

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
        onEditSeries={handleEditSeries}
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
            : handleCreateTransaction
        }
        onEditSeries={handleEditSeriesFromModal}
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
                <CloseIcon />
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

      {editingSeries && (
        <div
          className={styles.modalOverlay}
          onClick={() => setEditingSeries(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Edit Recurring Series"
        >
          <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalHeading}>Edit Recurring Series</h2>
              <div className={styles.modalHeaderActions}>
                <button
                  type="button"
                  onClick={handleDeleteSeries}
                  disabled={isDeletingSeries}
                  className={styles.deleteButton}
                  aria-label="Delete series"
                >
                  Delete
                </button>
                <button
                  onClick={() => setEditingSeries(null)}
                  className={styles.closeButton}
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>
            <RecurringTransactionForm
              initialValues={mapRecurringToFormValues(editingSeries)}
              categories={categories}
              onCreateCategory={handleCreateCategory}
              onSubmit={handleUpdateSeries}
              onCancel={() => setEditingSeries(null)}
            />
          </div>
        </div>
      )}
    </main>
  );
}
