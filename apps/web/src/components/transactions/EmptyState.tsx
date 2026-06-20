import { EmptyDocIcon } from '@/components/icons';

interface EmptyStateProps {
  onCreateClick: () => void;
}

export function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4">
        <EmptyDocIcon className="w-16 h-16 text-mercury-secondary/30" />
      </div>
      <h3 className="text-xl font-heading text-mercury-text mb-2">No transactions yet</h3>
      <p className="text-mercury-secondary mb-6 max-w-sm">
        Start tracking your income and expenses. Create your first transaction to get going.
      </p>
      <button
        onClick={onCreateClick}
        className="bg-mercury-cta text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:opacity-90 hover:-translate-y-px cursor-pointer"
      >
        Create your first transaction
      </button>
    </div>
  );
}
