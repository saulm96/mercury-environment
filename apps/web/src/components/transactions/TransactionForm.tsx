import { useState, type FormEvent } from 'react';
import type { Category } from '@mercury/shared';
import { CategorySelect } from '@/components/categories/CategorySelect';
import { SpinnerIcon } from '@/components/icons';
import styles from './TransactionForm.module.css';

export interface TransactionFormData {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  categoryId?: string;
}

interface TransactionFormProps {
  initialValues?: Partial<TransactionFormData>;
  categories: Category[];
  onCreateCategory: (name: string, type: 'income' | 'expense', color?: string) => Promise<Category>;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onCancel: () => void;
}

interface FormErrors {
  amount?: string;
  description?: string;
  date?: string;
}

export function TransactionForm({
  initialValues,
  categories,
  onCreateCategory,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const [type, setType] = useState<'income' | 'expense'>(
    initialValues?.type ?? 'expense',
  );
  const [amount, setAmount] = useState(initialValues?.amount?.toString() ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [date, setDate] = useState(
    initialValues?.date?.split('T')[0] ?? new Date().toISOString().split('T')[0],
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    initialValues?.categoryId ?? null,
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = 'Please enter a valid positive amount.';
    }
    if (!description.trim()) {
      newErrors.description = 'Description is required.';
    }
    if (!date) {
      newErrors.date = 'Date is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        type,
        amount: Number(amount),
        description: description.trim(),
        date,
        categoryId: categoryId ?? undefined,
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Submission failed.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const incomeToggle = [
    styles.toggle,
    type === 'income' ? styles.toggleIncome : styles.toggleInactive,
  ].join(' ');

  const expenseToggle = [
    styles.toggle,
    type === 'expense' ? styles.toggleExpense : styles.toggleInactive,
  ].join(' ');

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label className={`${styles.label} ${styles.labelSmall}`}>Type</label>
        <div className={styles.toggleGroup}>
          <button type="button" onClick={() => setType('income')} className={incomeToggle}>
            Income
          </button>
          <button type="button" onClick={() => setType('expense')} className={expenseToggle}>
            Expense
          </button>
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="amount" className={`${styles.label} ${styles.labelSmall}`}>
          Amount
        </label>
        <div className={styles.inputWrapper}>
          <span className={styles.currencySymbol}>$</span>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={[
              styles.textInput,
              styles.numberInput,
              errors.amount ? styles.inputError : '',
            ].filter(Boolean).join(' ')}
          />
        </div>
        {errors.amount && <p className={styles.fieldError}>{errors.amount}</p>}
      </div>

      <div className={styles.field}>
        <label htmlFor="description" className={`${styles.label} ${styles.labelSmall}`}>
          Description
        </label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Coffee, Salary"
          className={[
            styles.textInput,
            errors.description ? styles.inputError : '',
          ].filter(Boolean).join(' ')}
        />
        {errors.description && <p className={styles.fieldError}>{errors.description}</p>}
      </div>

      <div className={styles.field}>
        <label htmlFor="date" className={`${styles.label} ${styles.labelSmall}`}>
          Date
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={[
            styles.textInput,
            errors.date ? styles.inputError : '',
          ].filter(Boolean).join(' ')}
        />
        {errors.date && <p className={styles.fieldError}>{errors.date}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>
          Category <span className={styles.labelOptional}>(optional)</span>
        </label>
        <CategorySelect
          categories={categories}
          type={type}
          value={categoryId}
          onChange={setCategoryId}
          onCreateCategory={onCreateCategory}
          disabled={isSubmitting}
        />
      </div>

      {submitError && (
        <div className={styles.submitError}>{submitError}</div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className={styles.cancelButton}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={styles.submitButton}
        >
          {isSubmitting && <SpinnerIcon />}
          {initialValues?.description ? 'Save Changes' : 'Create Transaction'}
        </button>
      </div>
    </form>
  );
}
