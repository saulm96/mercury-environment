import type { Transaction } from '@mercury/shared';
import { ArrowUpIcon, ArrowDownIcon } from '@/components/icons';

interface TransactionCardProps {
  transaction: Transaction;
  onEdit: (tx: Transaction) => void;
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

export function TransactionCard({ transaction, onEdit }: TransactionCardProps) {
  const isIncome = transaction.type === 'income';

  return (
    <div
      className="rounded-card bg-mercury-background p-6 shadow-mercury-md transition-all duration-200 hover:shadow-mercury-lg hover:-translate-y-0.5 cursor-pointer"
      onClick={() => onEdit(transaction)}
    >
      <div className="flex items-center gap-2 mb-3">
        {isIncome ? (
          <span
            className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600"
            aria-label="Income"
          >
            <ArrowUpIcon />
          </span>
        ) : (
          <span
            className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 text-rose-600"
            aria-label="Expense"
          >
            <ArrowDownIcon />
          </span>
        )}
        <span className="text-sm text-mercury-secondary">{formatDate(transaction.date)}</span>
      </div>

      {/* Description */}
      <p className="text-mercury-text font-medium mb-2">{transaction.description}</p>

      {/* Bottom row: category badge + amount */}
      <div className="flex items-center justify-between">
        {transaction.category ? (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full"
            style={{
              backgroundColor: transaction.category.color
                ? `${transaction.category.color}18`
                : '#F3F4F6',
              color: transaction.category.color ?? '#6B7280',
            }}
          >
            {transaction.category.color && (
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: transaction.category.color }}
              />
            )}
            {transaction.category.name}
          </span>
        ) : (
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-mercury-secondary/60">
            Uncategorized
          </span>
        )}
        <span
          className={`text-lg font-semibold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}
        >
          {isIncome ? '+' : '-'}
          {formatCurrency(transaction.amount)}
        </span>
      </div>
    </div>
  );
}
