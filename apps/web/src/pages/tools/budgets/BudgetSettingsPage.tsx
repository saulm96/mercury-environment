import { useState, useMemo } from 'react';
import { useBudgets } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { BudgetForm, type BudgetFormData } from '@/components/budgets/BudgetForm';
import { PlusIcon, PencilIcon, TrashIcon, SpinnerIcon } from '@/components/icons';
import type { Budget } from '@mercury/shared';
import styles from './BudgetSettingsPage.module.css';

function formatBudgetValue(value: number): string {
  return `${Number(value).toFixed(2)}€`;
}

interface BudgetCardProps {
  budget: Budget;
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
}

function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const budgetCategories = budget.categories ?? [];

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardMain}>
          <h3 className={styles.cardName}>{budget.name}</h3>
          <p className={styles.cardMeta}>
            <span className={styles.valueBadge}>{formatBudgetValue(budget.value)}</span>
          </p>
        </div>
        <div className={styles.cardActions}>
          <button
            type="button"
            onClick={() => onEdit(budget)}
            className={styles.iconButton}
            aria-label={`Edit ${budget.name} budget`}
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            onClick={() => onDelete(budget)}
            className={`${styles.iconButton} ${styles.deleteIconButton}`}
            aria-label={`Delete ${budget.name} budget`}
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {budgetCategories.length > 0 && (
        <div className={styles.chips}>
          {budgetCategories.map((category) => (
            <span key={category.id} className={styles.chip}>
              <span
                className={styles.chipDot}
                style={{ backgroundColor: category.color ?? '#D1D5DB' }}
              />
              <span className={styles.chipName}>{category.name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface DeleteConfirmModalProps {
  budgetName: string;
  isDeleting: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

function DeleteConfirmModal({ budgetName, isDeleting, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Delete budget">
      <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalHeading}>Delete budget</h2>
        <p className={styles.modalText}>
          Delete &apos;{budgetName}&apos; budget? Categories won&apos;t be affected.
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
            {isDeleting ? (
              <>
                <SpinnerIcon className="icon-sm icon-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BudgetSettingsPage() {
  const {
    budgets,
    loading: budgetsLoading,
    error: budgetsError,
    fetchBudgets,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useBudgets();
  const { categories, loading: categoriesLoading, error: categoriesError } = useCategories();

  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLoading = budgetsLoading || categoriesLoading;
  const error = budgetsError ?? categoriesError;

  const budgetsWithCategories = useMemo<Budget[]>(() => {
    return budgets.map((budget) => ({
      ...budget,
      categories: budget.categories ?? [],
    }));
  }, [budgets]);

  function openCreateForm() {
    setEditingBudget(null);
    setIsFormOpen(true);
  }

  function openEditForm(budget: Budget) {
    setEditingBudget(budget);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingBudget(null);
  }

  async function handleFormSubmit(data: BudgetFormData) {
    if (editingBudget) {
      await handleUpdate(editingBudget.id, data);
    } else {
      await handleCreate({ ...data, period: 'monthly' });
    }
    closeForm();
  }

  async function confirmDelete() {
    if (!deletingBudget) return;
    setIsDeleting(true);
    try {
      await handleDelete(deletingBudget.id);
      setDeletingBudget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Budget Settings</h1>
        <button type="button" onClick={openCreateForm} className={styles.createButton}>
          <PlusIcon />
          New Budget
        </button>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <p className={styles.errorText}>{error}</p>
          <button className={styles.retryButton} onClick={fetchBudgets}>
            Retry
          </button>
        </div>
      )}

      {isLoading && (
        <div className={styles.skeletonList}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonTop} />
              <div className={styles.skeletonBottom} />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && budgetsWithCategories.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            No budgets yet. Create your first budget to start tracking spending limits.
          </p>
          <button type="button" onClick={openCreateForm} className={styles.createButton}>
            <PlusIcon />
            New Budget
          </button>
        </div>
      )}

      {!isLoading && !error && budgetsWithCategories.length > 0 && (
        <div className={styles.cardList}>
          {budgetsWithCategories.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={openEditForm}
              onDelete={setDeletingBudget}
            />
          ))}
        </div>
      )}

      {isFormOpen && (
        <BudgetForm
          budget={editingBudget}
          categories={categories}
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
        />
      )}

      {deletingBudget && (
        <DeleteConfirmModal
          budgetName={deletingBudget.name}
          isDeleting={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingBudget(null)}
        />
      )}
    </main>
  );
}
