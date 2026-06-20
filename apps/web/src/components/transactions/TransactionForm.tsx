'use client';

import { useState, type FormEvent } from 'react';
import type { Category } from '@mercury/shared';
import { CategorySelect } from '@/components/categories/CategorySelect';
import { SpinnerIcon } from '@/components/icons';

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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type toggle */}
      <div>
        <label className="block text-sm font-medium text-mercury-text mb-2">
          Type
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 cursor-pointer ${
              type === 'income'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-mercury-secondary hover:bg-gray-200'
            }`}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 cursor-pointer ${
              type === 'expense'
                ? 'bg-rose-600 text-white'
                : 'bg-gray-100 text-mercury-secondary hover:bg-gray-200'
            }`}
          >
            Expense
          </button>
        </div>
      </div>

      {/* Amount */}
      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-mercury-text mb-1.5"
        >
          Amount
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mercury-secondary text-sm">
            $
          </span>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={`w-full pl-8 pr-3 py-3 border rounded-lg text-mercury-text text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-mercury-primary/10 ${
              errors.amount
                ? 'border-rose-500'
                : 'border-gray-200 focus:border-mercury-primary'
            }`}
          />
        </div>
        {errors.amount && (
          <p className="text-rose-500 text-xs mt-1">{errors.amount}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-mercury-text mb-1.5"
        >
          Description
        </label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Coffee, Salary"
          className={`w-full px-3 py-3 border rounded-lg text-mercury-text text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-mercury-primary/10 ${
            errors.description
              ? 'border-rose-500'
              : 'border-gray-200 focus:border-mercury-primary'
          }`}
        />
        {errors.description && (
          <p className="text-rose-500 text-xs mt-1">{errors.description}</p>
        )}
      </div>

      {/* Date */}
      <div>
        <label
          htmlFor="date"
          className="block text-sm font-medium text-mercury-text mb-1.5"
        >
          Date
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`w-full px-3 py-3 border rounded-lg text-mercury-text text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-mercury-primary/10 ${
            errors.date
              ? 'border-rose-500'
              : 'border-gray-200 focus:border-mercury-primary'
          }`}
        />
        {errors.date && (
          <p className="text-rose-500 text-xs mt-1">{errors.date}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label
          htmlFor="category"
          className="block text-sm font-medium text-mercury-text mb-1.5"
        >
          Category{' '}
          <span className="text-mercury-secondary font-normal">(optional)</span>
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

      {/* Submit error */}
      {submitError && (
        <div className="p-3 rounded-lg bg-rose-50 text-rose-600 text-sm">
          {submitError}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 py-2.5 px-4 rounded-lg border-2 border-mercury-primary text-mercury-primary font-semibold text-sm transition-all duration-200 hover:bg-mercury-primary hover:text-white disabled:opacity-50 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-2.5 px-4 rounded-lg bg-mercury-cta text-white font-semibold text-sm transition-all duration-200 hover:opacity-90 hover:-translate-y-px disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
        >
          {isSubmitting && <SpinnerIcon />}
          {initialValues?.description ? 'Save Changes' : 'Create Transaction'}
        </button>
      </div>
    </form>
  );
}
