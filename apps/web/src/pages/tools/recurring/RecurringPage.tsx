import { useState, useMemo } from 'react';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useRecurringSync } from '@/components/transactions/RecurringSyncProvider';
import { RecurringTransactionCardList } from '@/components/transactions/RecurringTransactionCardList';
import { RecurringTransactionForm } from '@/components/transactions/RecurringTransactionForm';
import { CategoryManager } from '@/components/categories/CategoryManager';
import { BulletListIcon, CloseIcon } from '@/components/icons';
import type { RecurringTransaction } from '@mercury/shared';
import RecurringSkeleton from './RecurringSkeleton';
import styles from './RecurringPage.module.css';

interface DeleteConfirmModalProps {
  description: string;
  isDeleting: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

function DeleteConfirmModal({ description, isDeleting, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Delete recurring transaction">
      <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalHeading}>Delete recurring transaction</h2>
        <p className={styles.modalText}>
          Delete &apos;{description}&apos;? This will stop future occurrences.
        </p>
        <div className={styles.modalActions}>
          <button
            type="button"
            onClick={onCancel}
            className={styles.cancelButton}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={styles.deleteButton}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecurringPage() {
  const { ready: syncReady, error: syncError } = useRecurringSync();
  const {
    recurringTransactions,
    loading,
    error,
    fetchRecurringTransactions,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useRecurringTransactions();
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    handleCreate: handleCreateCategory,
    handleDelete: handleDeleteCategoryRaw,
  } = useCategories();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);
  const [deletingRecurring, setDeletingRecurring] = useState<RecurringTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const isLoading = loading || categoriesLoading;
  const pageError = error ?? categoriesError;

  const recurringCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const rt of recurringTransactions) {
      if (rt.categoryId) {
        counts[rt.categoryId] = (counts[rt.categoryId] ?? 0) + 1;
      }
    }
    return counts;
  }, [recurringTransactions]);

  function openCreateForm() {
    setEditingRecurring(null);
    setIsFormOpen(true);
  }

  function openEditForm(rt: RecurringTransaction) {
    setEditingRecurring(rt);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingRecurring(null);
  }

  async function handleFormSubmit(data: Parameters<typeof handleCreate>[0]) {
    if (editingRecurring) {
      await handleUpdate(editingRecurring.id, data);
    } else {
      await handleCreate(data);
    }
    closeForm();
  }

  async function handleDeleteCategory(id: string) {
    await handleDeleteCategoryRaw(id);
    await fetchRecurringTransactions();
  }

  async function confirmDelete() {
    if (!deletingRecurring) return;
    setIsDeleting(true);
    try {
      await handleDelete(deletingRecurring.id);
      setDeletingRecurring(null);
    } finally {
      setIsDeleting(false);
    }
  }

  if (!syncReady) {
    return <RecurringSkeleton />;
  }

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Recurring Transactions</h1>
        <div className={styles.actions}>
          <button
            onClick={() => setShowCategoryManager(true)}
            className={styles.categoryButton}
            aria-label="Manage Categories"
          >
            <BulletListIcon />
          </button>
          <button onClick={openCreateForm} className={styles.createButton}>
            New Recurring
          </button>
        </div>
      </div>

      {syncError && (
        <div className={styles.errorBanner}>
          <p className={styles.errorText}>Sync warning: {syncError}</p>
        </div>
      )}

      <RecurringTransactionCardList
        recurringTransactions={recurringTransactions}
        loading={isLoading}
        error={pageError}
        onEdit={openEditForm}
        onDelete={setDeletingRecurring}
        onCreateClick={openCreateForm}
      />

      {isFormOpen && (
        <div
          className={styles.modalOverlay}
          onClick={closeForm}
          role="dialog"
          aria-modal="true"
          aria-label={editingRecurring ? 'Edit Recurring Transaction' : 'New Recurring Transaction'}
        >
          <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalHeading}>
                {editingRecurring ? 'Edit Recurring Transaction' : 'New Recurring Transaction'}
              </h2>
              <button
                onClick={closeForm}
                className={styles.closeButton}
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>
            <RecurringTransactionForm
              initialValues={
                editingRecurring
                  ? {
                      type: editingRecurring.type,
                      amount: editingRecurring.amount,
                      description: editingRecurring.description,
                      date: editingRecurring.startDate,
                      frequency: editingRecurring.frequency,
                      interval: editingRecurring.interval,
                      endDate: editingRecurring.endDate ?? undefined,
                      dayOfMonth: editingRecurring.dayOfMonth ?? undefined,
                      dayOfWeek: editingRecurring.dayOfWeek ?? undefined,
                      categoryId: editingRecurring.categoryId ?? undefined,
                    }
                  : undefined
              }
              categories={categories}
              onCreateCategory={handleCreateCategory}
              onSubmit={handleFormSubmit}
              onCancel={closeForm}
            />
          </div>
        </div>
      )}

      {deletingRecurring && (
        <DeleteConfirmModal
          description={deletingRecurring.description}
          isDeleting={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingRecurring(null)}
        />
      )}

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
              transactionCounts={recurringCounts}
              onCreateCategory={handleCreateCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          </div>
        </div>
      )}
    </main>
  );
}
