import type { Transaction, Category } from '@mercury/shared';
import { TransactionForm } from './TransactionForm';
import type { TransactionFormData } from './TransactionForm';
import styles from './TransactionModal.module.css';

interface TransactionModalProps {
  isOpen: boolean;
  transaction?: Transaction;
  categories: Category[];
  onCreateCategory: (name: string, type: 'income' | 'expense', color?: string) => Promise<Category>;
  onClose: () => void;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onEditSeries?: (transaction: Transaction) => void;
}

export function TransactionModal({
  isOpen,
  transaction,
  categories,
  onCreateCategory,
  onClose,
  onSubmit,
  onEditSeries,
}: TransactionModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={transaction ? 'Edit Transaction' : 'New Transaction'}
    >
      <div
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={styles.heading}>
          {transaction ? 'Edit Transaction' : 'New Transaction'}
        </h2>
        {transaction && transaction.recurringTransactionId && (
          <div className={styles.recurringHint}>
            <p className={styles.recurringHintText}>
              This transaction belongs to a recurring series. Changes here only
              affect this occurrence.
            </p>
            {onEditSeries && (
              <button
                type="button"
                onClick={() => transaction && onEditSeries(transaction)}
                className={styles.editSeriesButton}
              >
                Edit series instead
              </button>
            )}
          </div>
        )}
        <TransactionForm
          initialValues={
            transaction
              ? {
                  type: transaction.type,
                  amount: transaction.amount,
                  description: transaction.description,
                  date: transaction.date,
                  categoryId: transaction.categoryId ?? undefined,
                }
              : undefined
          }
          categories={categories}
          onCreateCategory={onCreateCategory}
          onSubmit={onSubmit}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
