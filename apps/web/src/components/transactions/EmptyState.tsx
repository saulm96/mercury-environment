interface EmptyStateProps {
  onCreateClick: () => void;
}

export function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-16 h-16 text-mercury-secondary/30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
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
