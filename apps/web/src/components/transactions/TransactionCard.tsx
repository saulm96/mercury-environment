import type { Transaction } from '@mercury/shared';

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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </span>
        ) : (
          <span
            className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 text-rose-600"
            aria-label="Expense"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </span>
        )}
        <span className="text-sm text-mercury-secondary">{formatDate(transaction.date)}</span>
      </div>

      {/* Description */}
      <p className="text-mercury-text font-medium mb-2">{transaction.description}</p>

      {/* Bottom row: category badge + amount */}
      <div className="flex items-center justify-between">
        {transaction.category ? (
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-mercury-secondary">
            {transaction.category}
          </span>
        ) : (
          <span />
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
