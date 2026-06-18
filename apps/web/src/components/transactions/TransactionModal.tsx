'use client';

import type { Transaction, Category } from '@mercury/shared';
import { TransactionForm } from './TransactionForm';
import type { TransactionFormData } from './TransactionForm';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={transaction ? 'Edit Transaction' : 'New Transaction'}
    >
      <div
        className="bg-white rounded-modal p-8 shadow-mercury-xl max-w-[500px] w-full transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-heading text-mercury-text mb-6">
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
