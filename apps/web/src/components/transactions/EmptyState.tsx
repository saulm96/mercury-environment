import { EmptyDocIcon } from '@/components/icons';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  onCreateClick: () => void;
}

export function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.icon}>
        <EmptyDocIcon className="w-16 h-16 text-mercury-secondary/30" />
      </div>
      <h3 className={styles.heading}>No transactions yet</h3>
      <p className={styles.text}>
        Start tracking your income and expenses. Create your first transaction to get going.
      </p>
      <button
        onClick={onCreateClick}
        className={styles.ctaButton}
      >
        Create your first transaction
      </button>
    </div>
  );
}
