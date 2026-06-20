import { SpinnerIcon } from '@/components/icons';
import styles from './ConfirmDeleteModal.module.css';

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
      className={styles.overlay}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={`Delete category ${categoryName}`}
    >
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.heading}>Delete &ldquo;{categoryName}&rdquo;?</h2>

        <p className={styles.message}>
          {affectedCount > 0
            ? `${affectedCount} transaction${affectedCount === 1 ? '' : 's'} use this category. ${affectedCount === 1 ? 'It will' : 'They will'} be moved to "${fallbackName}".`
            : `No transactions use this category. It will be deleted.`}
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className={styles.deleteButton}
          >
            {isDeleting && <SpinnerIcon />}
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
