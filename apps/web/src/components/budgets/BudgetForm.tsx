import { useState, useEffect } from 'react';
import type { Budget, Category } from '@mercury/shared';
import { CloseIcon, SpinnerIcon } from '@/components/icons';
import styles from './BudgetForm.module.css';

export interface BudgetFormData {
  name: string;
  value: number;
  categoryIds: string[];
}

interface BudgetFormProps {
  budget?: Budget | null;
  categories: Category[];
  onSubmit: (data: BudgetFormData) => Promise<void>;
  onCancel: () => void;
}

interface ValidationErrors {
  name?: string;
  value?: string;
  categories?: string;
}

export function BudgetForm({ budget = null, categories, onSubmit, onCancel }: BudgetFormProps) {
  const isEditMode = budget !== null && budget !== undefined;

  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    if (budget) {
      setName(budget.name);
      setValue(String(budget.value));
      setSelectedCategoryIds(budget.categories?.map((c) => c.id) ?? []);
    } else {
      setName('');
      setValue('');
      setSelectedCategoryIds([]);
    }
    setErrors({});
  }, [budget]);

  function validate(): boolean {
    const nextErrors: ValidationErrors = {};
    const trimmedName = name.trim();

    if (!trimmedName) {
      nextErrors.name = 'Name is required.';
    } else if (trimmedName.length > 100) {
      nextErrors.name = 'Name must be 100 characters or less.';
    }

    const numericValue = parseFloat(value);
    if (value === '' || Number.isNaN(numericValue) || numericValue <= 0) {
      nextErrors.value = 'Value must be greater than 0.';
    }

    if (selectedCategoryIds.length === 0) {
      nextErrors.categories = 'Select at least one category.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        value: parseFloat(value),
        categoryIds: selectedCategoryIds,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id],
    );
  }

  const valueLabel = '€';
  const valuePlaceholder = 'e.g. 500';
  const valueStep = '0.01';
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={isEditMode ? 'Edit Budget' : 'New Budget'}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.heading}>{isEditMode ? 'Edit Budget' : 'New Budget'}</h2>
          <button type="button" onClick={onCancel} className={styles.closeButton} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="budget-name" className={styles.label}>
              Name
            </label>
            <input
              id="budget-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Budget name"
              minLength={1}
              maxLength={100}
              className={styles.input}
              disabled={isSubmitting}
            />
            {errors.name && <p className={styles.errorText}>{errors.name}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="budget-value" className={styles.label}>
              Value ({valueLabel})
            </label>
            <div className={styles.valueInputWrapper}>
              <input
                id="budget-value"
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={valuePlaceholder}
                min={0.01}
                step={valueStep}
                className={styles.input}
                disabled={isSubmitting}
              />
              <span className={styles.valueSuffix}>{valueLabel}</span>
            </div>
            {errors.value && <p className={styles.errorText}>{errors.value}</p>}
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Categories (select at least one)</span>
            <div className={styles.categoriesList} role="group" aria-label="Categories">
              {expenseCategories.map((category) => {
                const isSelected = selectedCategoryIds.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => toggleCategory(category.id)}
                    className={`${styles.categoryItem} ${isSelected ? styles.categoryItemSelected : ''}`}
                    disabled={isSubmitting}
                  >
                    <span
                      className={styles.categoryDot}
                      style={{ backgroundColor: category.color ?? '#D1D5DB' }}
                    />
                    <span className={styles.categoryName}>{category.name}</span>
                    {category.isFallback && <span className={styles.defaultBadge}>(default)</span>}
                    {isSelected && (
                      <svg
                        className={styles.checkIcon}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
            {errors.categories && <p className={styles.errorText}>{errors.categories}</p>}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon className="icon-sm icon-spin" />
                  Saving...
                </>
              ) : isEditMode ? (
                'Save Changes'
              ) : (
                'Save Budget'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
