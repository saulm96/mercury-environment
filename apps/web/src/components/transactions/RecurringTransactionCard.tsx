import type { RecurringTransaction } from '@mercury/shared';
import { ArrowUpIcon, ArrowDownIcon, PencilIcon, TrashIcon } from '@/components/icons';
import styles from './RecurringTransactionCard.module.css';

interface RecurringTransactionCardProps {
  recurringTransaction: RecurringTransaction;
  onEdit: (rt: RecurringTransaction) => void;
  onDelete: (rt: RecurringTransaction) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatFrequency(frequency: RecurringTransaction['frequency'], interval: number): string {
  if (interval === 1) {
    switch (frequency) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'yearly':
        return 'Yearly';
    }
  }
  switch (frequency) {
    case 'daily':
      return `Every ${interval} days`;
    case 'weekly':
      return `Every ${interval} weeks`;
    case 'monthly':
      return `Every ${interval} months`;
    case 'yearly':
      return `Every ${interval} years`;
  }
}

export function RecurringTransactionCard({
  recurringTransaction,
  onEdit,
  onDelete,
}: RecurringTransactionCardProps) {
  const isIncome = recurringTransaction.type === 'income';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {isIncome ? (
            <span className={styles.iconIncome} aria-label="Income">
              <ArrowUpIcon />
            </span>
          ) : (
            <span className={styles.iconExpense} aria-label="Expense">
              <ArrowDownIcon />
            </span>
          )}
          <div className={styles.meta}>
            <p className={styles.description}>{recurringTransaction.description}</p>
            <span className={styles.frequency}>{formatFrequency(recurringTransaction.frequency, recurringTransaction.interval)}</span>
          </div>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => onEdit(recurringTransaction)}
            className={styles.iconButton}
            aria-label={`Edit ${recurringTransaction.description}`}
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            onClick={() => onDelete(recurringTransaction)}
            className={`${styles.iconButton} ${styles.deleteIconButton}`}
            aria-label={`Delete ${recurringTransaction.description}`}
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Next occurrence</span>
          <span className={styles.detailValue}>{formatDate(recurringTransaction.nextDate)}</span>
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Started</span>
          <span className={styles.detailValue}>{formatDate(recurringTransaction.startDate)}</span>
        </div>
      </div>

      <div className={styles.footer}>
        {recurringTransaction.category ? (
          <span
            className={styles.categoryBadge}
            style={{
              backgroundColor: recurringTransaction.category.color
                ? `${recurringTransaction.category.color}18`
                : '#F3F4F6',
              color: recurringTransaction.category.color ?? '#6B7280',
            }}
          >
            {recurringTransaction.category.color && (
              <span
                className={styles.categoryDot}
                style={{ backgroundColor: recurringTransaction.category.color }}
              />
            )}
            {recurringTransaction.category.name}
          </span>
        ) : (
          <span className={styles.uncategorized}>Uncategorized</span>
        )}
        <div className={styles.footerRight}>
          <span className={`${styles.statusBadge} ${styles[`status${recurringTransaction.status.charAt(0).toUpperCase()}${recurringTransaction.status.slice(1)}`]}`}>
            {recurringTransaction.status}
          </span>
          <span
            className={`${styles.amount} ${isIncome ? styles.amountPositive : styles.amountNegative}`}
          >
            {isIncome ? '+' : '-'}
            {formatCurrency(recurringTransaction.amount)}
          </span>
        </div>
      </div>
    </div>
  );
}
