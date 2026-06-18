'use client';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  categoryName: string;
  fallbackName: string;
  affectedCount: number;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  categoryName,
  fallbackName,
  affectedCount,
  isDeleting,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={`Delete category ${categoryName}`}
    >
      <div
        className="bg-white rounded-modal p-8 shadow-mercury-xl max-w-[440px] w-full transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-heading text-mercury-text mb-3">
          Delete &ldquo;{categoryName}&rdquo;?
        </h2>

        <p className="text-sm text-mercury-secondary leading-relaxed mb-8">
          {affectedCount > 0
            ? `${affectedCount} transaction${affectedCount === 1 ? '' : 's'} use this category. ${affectedCount === 1 ? 'It will' : 'They will'} be moved to "${fallbackName}".`
            : `No transactions use this category. It will be deleted.`}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 rounded-lg border-2 border-mercury-primary text-mercury-primary font-semibold text-sm transition-all duration-200 hover:bg-mercury-primary hover:text-white disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 rounded-lg bg-rose-600 text-white font-semibold text-sm transition-all duration-200 hover:opacity-90 hover:-translate-y-px disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {isDeleting && (
              <svg
                className="animate-spin w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
