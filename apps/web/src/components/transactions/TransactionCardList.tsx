import type { Transaction } from '@mercury/shared';
import { TransactionCard } from './TransactionCard';
import { EmptyState } from './EmptyState';

interface TransactionCardListProps {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  onEdit: (tx: Transaction) => void;
  onCreateClick: () => void;
}

function SkeletonCard() {
  return (
    <div className="rounded-card bg-mercury-background p-6 shadow-mercury-md">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
          <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="w-7 h-7 bg-gray-200 animate-pulse rounded-lg" />
      </div>
      <div className="h-5 w-3/4 bg-gray-200 animate-pulse rounded mb-2" />
      <div className="flex items-center justify-between">
        <div className="h-5 w-16 bg-gray-200 animate-pulse rounded-full" />
        <div className="h-6 w-20 bg-gray-200 animate-pulse rounded" />
      </div>
    </div>
  );
}

export function TransactionCardList({
  transactions,
  loading,
  error,
  onEdit,
  onCreateClick,
}: TransactionCardListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-rose-600 mb-2">{error}</p>
        <p className="text-mercury-secondary text-sm">Please try refreshing the page.</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return <EmptyState onCreateClick={onCreateClick} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {transactions.map((tx) => (
        <TransactionCard key={tx.id} transaction={tx} onEdit={onEdit} />
      ))}
    </div>
  );
}
