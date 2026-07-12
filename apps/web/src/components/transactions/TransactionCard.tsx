import type { Transaction } from '@mercury/shared';
import { ArrowUpIcon, ArrowDownIcon, RepeatIcon } from '@/components/icons';
import styles from './TransactionCard.module.css';

interface TransactionCardProps {
  transaction: Transaction;
  onEdit: (tx: Transaction) => void;
  onEditSeries?: (tx: Transaction) => void;
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

export function TransactionCard({ transaction, onEdit, onEditSeries }: TransactionCardProps) {
  const isIncome = transaction.type === 'income';

  return (
    <div className={styles.card} onClick={() => onEdit(transaction)}>
      <div className={styles.header}>
        {isIncome ? (
          <span className={styles.iconIncome} aria-label="Income">
            <ArrowUpIcon />
          </span>
        ) : (
          <span className={styles.iconExpense} aria-label="Expense">
            <ArrowDownIcon />
          </span>
        )}
        <span className={styles.date}>{formatDate(transaction.date)}</span>
        {transaction.recurringTransactionId && (
          <button
            className={styles.recurringBadge}
            aria-label="View recurring series"
            onClick={(e) => { e.stopPropagation(); onEditSeries?.(transaction); }}
          >
            <RepeatIcon />
            <span className={styles.recurringText}>recurring</span>
          </button>
        )}
      </div>

      <p className={styles.description}>{transaction.description}</p>

      <div className={styles.footer}>
        {transaction.category ? (
          <span
            className={styles.categoryBadge}
            style={{
              backgroundColor: transaction.category.color
                ? `${transaction.category.color}18`
                : '#F3F4F6',
              color: transaction.category.color ?? '#6B7280',
            }}
          >
            {transaction.category.color && (
              <span
                className={styles.categoryDot}
                style={{ backgroundColor: transaction.category.color }}
              />
            )}
            {transaction.category.name}
          </span>
        ) : (
          <span className={styles.uncategorized}>Uncategorized</span>
        )}
        <span
          className={`${styles.amount} ${isIncome ? styles.amountPositive : styles.amountNegative}`}
        >
          {isIncome ? '+' : '-'}
          {formatCurrency(transaction.amount)}
        </span>
      </div>
    </div>
  );
}
