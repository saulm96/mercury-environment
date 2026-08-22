import { useState, type FormEvent } from 'react';
import type { Category, ServiceType } from '@mercury/shared';
import { CategorySelect } from '@/components/categories/CategorySelect';
import { SpinnerIcon } from '@/components/icons';
import styles from './TransactionForm.module.css';

export interface TransactionFormData {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  categoryId?: string;
  // Recurring fields (only set when isRecurring is true)
  isRecurring?: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  endDate?: string;
  dayOfMonth?: number;
  dayOfWeek?: number;
  // Subscription fields (only set when isRecurring AND isSubscription are true)
  isSubscription?: boolean;
  serviceType?: ServiceType;
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
  frequency?: string;
  interval?: string;
  endDate?: string;
  dayOfMonth?: string;
  dayOfWeek?: string;
  serviceType?: string;
}

const WEEK_DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const SERVICE_TYPES: ServiceType[] = [
  'streaming',
  'ai',
  'cloud',
  'productivity',
  'music',
  'gaming',
  'other',
];

export function TransactionForm({
  initialValues,
  categories,
  onCreateCategory,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const isCreateMode = !initialValues?.description;

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

  const [isRecurring, setIsRecurring] = useState(initialValues?.isRecurring ?? false);
  const [frequency, setFrequency] = useState<NonNullable<TransactionFormData['frequency']>>(
    initialValues?.frequency ?? 'monthly',
  );
  const [interval, setInterval] = useState(
    initialValues?.interval?.toString() ?? '1',
  );
  const [endDate, setEndDate] = useState(initialValues?.endDate?.split('T')[0] ?? '');
  const [dayOfMonth, setDayOfMonth] = useState(
    initialValues?.dayOfMonth?.toString() ?? '',
  );
  const [dayOfWeek, setDayOfWeek] = useState(
    initialValues?.dayOfWeek !== undefined ? initialValues.dayOfWeek.toString() : '',
  );

  const [isSubscription, setIsSubscription] = useState(
    initialValues?.isSubscription ?? false,
  );
  const [serviceType, setServiceType] = useState<ServiceType>(
    initialValues?.serviceType ?? 'streaming',
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
      newErrors.date = isRecurring ? 'Start date is required.' : 'Date is required.';
    }

    if (isRecurring) {
      if (!frequency) {
        newErrors.frequency = 'Frequency is required.';
      }
      if (!interval || isNaN(Number(interval)) || Number(interval) < 1) {
        newErrors.interval = 'Interval must be at least 1.';
      }
      if (endDate && date && new Date(endDate) < new Date(date)) {
        newErrors.endDate = 'End date must be after start date.';
      }
      if (frequency === 'monthly' && dayOfMonth) {
        const dom = Number(dayOfMonth);
        if (isNaN(dom) || dom < 1 || dom > 31) {
          newErrors.dayOfMonth = 'Day of month must be between 1 and 31.';
        }
      }
      if (frequency === 'weekly' && dayOfWeek) {
        const dow = Number(dayOfWeek);
        if (isNaN(dow) || dow < 0 || dow > 6) {
          newErrors.dayOfWeek = 'Please select a valid day of the week.';
        }
      }
      if (isSubscription && !serviceType) {
        newErrors.serviceType = 'Service type is required.';
      }
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
      const payload: TransactionFormData = {
        type,
        amount: Number(amount),
        description: description.trim(),
        date,
        categoryId: categoryId ?? undefined,
      };

      if (isRecurring) {
        payload.isRecurring = true;
        payload.frequency = frequency;
        payload.interval = Number(interval);

        if (endDate) {
          payload.endDate = endDate;
        }
        if (frequency === 'monthly' && dayOfMonth) {
          payload.dayOfMonth = Number(dayOfMonth);
        }
        if (frequency === 'weekly' && dayOfWeek) {
          payload.dayOfWeek = Number(dayOfWeek);
        }

        if (type === 'expense' && isSubscription) {
          payload.isSubscription = true;
          payload.serviceType = serviceType;
        }
      }

      await onSubmit(payload);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Submission failed.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleTypeChange(nextType: 'income' | 'expense') {
    setType(nextType);
    if (nextType === 'income') {
      setIsSubscription(false);
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

  const submitLabel = initialValues?.description
    ? 'Save Changes'
    : isRecurring
      ? 'Create Recurring'
      : 'Create Transaction';

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label className={`${styles.label} ${styles.labelSmall}`}>Type</label>
        <div className={styles.toggleGroup}>
          <button type="button" onClick={() => handleTypeChange('income')} className={incomeToggle}>
            Income
          </button>
          <button type="button" onClick={() => handleTypeChange('expense')} className={expenseToggle}>
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
          {isRecurring ? 'Start date' : 'Date'}
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

      {isCreateMode && (
        <div className={styles.checkboxRow}>
          <input
            id="isRecurring"
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className={styles.checkboxInput}
          />
          <label htmlFor="isRecurring" className={styles.checkboxLabel}>
            Recurring?
          </label>
        </div>
      )}

      {isRecurring && (
        <>
          <div className={styles.field}>
            <label htmlFor="frequency" className={`${styles.label} ${styles.labelSmall}`}>
              Frequency
            </label>
            <select
              id="frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as NonNullable<TransactionFormData['frequency']>)}
              className={[
                styles.textInput,
                styles.selectInput,
                errors.frequency ? styles.inputError : '',
              ].filter(Boolean).join(' ')}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            {errors.frequency && <p className={styles.fieldError}>{errors.frequency}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="interval" className={`${styles.label} ${styles.labelSmall}`}>
              Interval
            </label>
            <input
              id="interval"
              type="number"
              min="1"
              step="1"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className={[
                styles.textInput,
                errors.interval ? styles.inputError : '',
              ].filter(Boolean).join(' ')}
            />
            {errors.interval && <p className={styles.fieldError}>{errors.interval}</p>}
          </div>

          {frequency === 'monthly' && (
            <div className={styles.field}>
              <label htmlFor="dayOfMonth" className={`${styles.label} ${styles.labelSmall}`}>
                Day of month <span className={styles.labelOptional}>(optional)</span>
              </label>
              <input
                id="dayOfMonth"
                type="number"
                min="1"
                max="31"
                step="1"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                placeholder="e.g., 15"
                className={[
                  styles.textInput,
                  errors.dayOfMonth ? styles.inputError : '',
                ].filter(Boolean).join(' ')}
              />
              {errors.dayOfMonth && <p className={styles.fieldError}>{errors.dayOfMonth}</p>}
            </div>
          )}

          {frequency === 'weekly' && (
            <div className={styles.field}>
              <label htmlFor="dayOfWeek" className={`${styles.label} ${styles.labelSmall}`}>
                Day of week <span className={styles.labelOptional}>(optional)</span>
              </label>
              <select
                id="dayOfWeek"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className={[
                  styles.textInput,
                  styles.selectInput,
                  errors.dayOfWeek ? styles.inputError : '',
                ].filter(Boolean).join(' ')}
              >
                <option value="">Select a day</option>
                {WEEK_DAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
              {errors.dayOfWeek && <p className={styles.fieldError}>{errors.dayOfWeek}</p>}
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="endDate" className={`${styles.label} ${styles.labelSmall}`}>
              End date <span className={styles.labelOptional}>(optional)</span>
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={[
                styles.textInput,
                errors.endDate ? styles.inputError : '',
              ].filter(Boolean).join(' ')}
            />
            {errors.endDate && <p className={styles.fieldError}>{errors.endDate}</p>}
          </div>

          {type === 'expense' && (
            <div className={styles.checkboxRow}>
              <input
                id="isSubscription"
                type="checkbox"
                checked={isSubscription}
                onChange={(e) => setIsSubscription(e.target.checked)}
                className={styles.checkboxInput}
              />
              <label htmlFor="isSubscription" className={styles.checkboxLabel}>
                Mark as subscription
              </label>
            </div>
          )}

          {type === 'expense' && isSubscription && (
            <div className={styles.field}>
              <label htmlFor="serviceType" className={`${styles.label} ${styles.labelSmall}`}>
                Service type
              </label>
              <select
                id="serviceType"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as ServiceType)}
                className={[
                  styles.textInput,
                  styles.selectInput,
                  errors.serviceType ? styles.inputError : '',
                ].filter(Boolean).join(' ')}
              >
                {SERVICE_TYPES.map((service) => (
                  <option key={service} value={service}>
                    {service.charAt(0).toUpperCase() + service.slice(1)}
                  </option>
                ))}
              </select>
              {errors.serviceType && <p className={styles.fieldError}>{errors.serviceType}</p>}
            </div>
          )}
        </>
      )}

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
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
