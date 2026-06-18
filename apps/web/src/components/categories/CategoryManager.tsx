'use client';

import { useState } from 'react';
import type { Category } from '@mercury/shared';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

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
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name..."
        autoFocus
        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-mercury-text text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-mercury-primary/10 focus:border-mercury-primary"
      />
      <button
        type="submit"
        disabled={isSubmitting || !name.trim()}
        className="px-3 py-2 bg-mercury-cta text-white text-sm font-semibold rounded-lg transition-all duration-200 hover:opacity-90 disabled:opacity-50 cursor-pointer whitespace-nowrap"
      >
        {isSubmitting ? '...' : 'Add'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="px-3 py-2 border border-gray-200 text-mercury-secondary text-sm rounded-lg transition-all duration-200 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
      >
        Cancel
      </button>
      {error && <p className="text-rose-500 text-xs">{error}</p>}
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
      <h3 className="text-lg font-heading text-mercury-text mb-4">{title}</h3>

      {items.length === 0 && !showAddForm && (
        <p className="text-sm text-mercury-secondary mb-3">
          No {type} categories yet.
        </p>
      )}

      <ul className="space-y-2">
        {items.map((cat) => (
          <li
            key={cat.id}
            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-mercury-background border border-gray-100 transition-all duration-200"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.color ?? '#D1D5DB' }}
              />
              <span className="text-sm text-mercury-text truncate">{cat.name}</span>
              {cat.isFallback && (
                <span className="text-xs text-mercury-secondary flex-shrink-0">(default)</span>
              )}
            </div>
            {!cat.isFallback && (
              <button
                type="button"
                onClick={() => onDeleteClick(cat)}
                className="flex-shrink-0 p-1.5 rounded-lg text-mercury-secondary hover:text-rose-600 hover:bg-rose-50 transition-all duration-200 cursor-pointer"
                aria-label={`Delete category ${cat.name}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
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
          className="mt-3 flex items-center gap-2 text-sm text-mercury-cta font-medium hover:underline transition-all duration-200 cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
