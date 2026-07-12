import type { FallbackProps } from 'react-error-boundary';
import styles from './RecurringError.module.css';

export default function RecurringError({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <main className={styles.main}>
      <div className={styles.errorContainer}>
        <h2 className={styles.heading}>Something went wrong</h2>
        <p className={styles.message}>
          {error.message ?? 'Failed to load recurring transactions.'}
        </p>
        <button onClick={resetErrorBoundary} className={styles.retryButton}>
          Try again
        </button>
      </div>
    </main>
  );
}
