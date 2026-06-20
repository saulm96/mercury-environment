import { useState } from 'react';
import type { Category } from '@mercury/shared';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { TrashIcon, PlusIcon } from '@/components/icons';
import styles from './CategoryManager.module.css';

interface CategoryManagerProps {
  categories: Category[];
  transactionCounts: Record<string, number>;
  onCreateCategory: (name: string, type: 'income' | 'expense', color?: string) => Promise<Category>;
  onDeleteCategory: (id: string) => Promise<void>;
}

const COLOR_PALETTE = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#AA96DA',
  '#FCBAD3', '#2ECC71', '#3498DB', '#9B59B6', '#F39C12',
];

function randomColor(): string {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

interface AddFormProps {
  type: 'income' | 'expense';
  onSubmit: (name: string, type: 'income' | 'expense', color: string) => Promise<void>;
  onCancel: () => void;
}

function AddCategoryForm({ type, onSubmit, onCancel }: AddFormProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed, type, randomColor());
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.addForm}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name..."
        autoFocus
        className={styles.addFormInput}
      />
      <button
        type="submit"
        disabled={isSubmitting || !name.trim()}
        className={styles.addFormSubmit}
      >
        {isSubmitting ? '...' : 'Add'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className={styles.addFormCancel}
      >
        Cancel
      </button>
      {error && <p className={styles.addFormError}>{error}</p>}
    </form>
  );
}

interface CategorySectionProps {
  title: string;
  type: 'income' | 'expense';
  items: Category[];
  onCreateCategory: (name: string, type: 'income' | 'expense', color?: string) => Promise<Category>;
  onDeleteClick: (category: Category) => void;
}

function CategorySection({
  title,
  type,
  items,
  onCreateCategory,
  onDeleteClick,
}: CategorySectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div>
      <h3 className={styles.sectionHeading}>{title}</h3>

      {items.length === 0 && !showAddForm && (
        <p className={styles.empty}>No {type} categories yet.</p>
      )}

      <ul className={styles.categoryList}>
        {items.map((cat) => (
          <li key={cat.id} className={styles.categoryItem}>
            <div className={styles.categoryLeft}>
              <span
                className={styles.categoryDot}
                style={{ backgroundColor: cat.color ?? '#D1D5DB' }}
              />
              <span className={styles.categoryName}>{cat.name}</span>
              {cat.isFallback && (
                <span className={styles.defaultBadge}>(default)</span>
              )}
            </div>
            {!cat.isFallback && (
              <button
                type="button"
                onClick={() => onDeleteClick(cat)}
                className={styles.deleteButton}
                aria-label={`Delete category ${cat.name}`}
              >
                <TrashIcon />
              </button>
            )}
          </li>
        ))}
      </ul>

      {showAddForm ? (
        <AddCategoryForm
          type={type}
          onSubmit={async (name, t, color) => {
            await onCreateCategory(name, t, color);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className={styles.addButton}
        >
          <PlusIcon />
          Add Category
        </button>
      )}
    </div>
  );
}

export function CategoryManager({
  categories,
  transactionCounts,
  onCreateCategory,
  onDeleteCategory,
}: CategoryManagerProps) {
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');
  const [confirmingCategory, setConfirmingCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirmDelete() {
    if (!confirmingCategory) return;
    setIsDeleting(true);
    try {
      await onDeleteCategory(confirmingCategory.id);
    } finally {
      setIsDeleting(false);
      setConfirmingCategory(null);
    }
  }

  return (
    <>
      <div className={styles.grid}>
        <CategorySection
          title="Expense Categories"
          type="expense"
          items={expenseCategories}
          onCreateCategory={onCreateCategory}
          onDeleteClick={(cat) => setConfirmingCategory(cat)}
        />
        <CategorySection
          title="Income Categories"
          type="income"
          items={incomeCategories}
          onCreateCategory={onCreateCategory}
          onDeleteClick={(cat) => setConfirmingCategory(cat)}
        />
      </div>

      <ConfirmDeleteModal
        isOpen={confirmingCategory !== null}
        categoryName={confirmingCategory?.name ?? ''}
        fallbackName={confirmingCategory?.type === 'expense' ? 'Others' : 'Other Income'}
        affectedCount={transactionCounts[confirmingCategory?.id ?? ''] ?? 0}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmingCategory(null)}
      />
    </>
  );
}
