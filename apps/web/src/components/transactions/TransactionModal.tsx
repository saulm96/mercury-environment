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
}

export function TransactionModal({
  isOpen,
  transaction,
  categories,
  onCreateCategory,
  onClose,
  onSubmit,
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
