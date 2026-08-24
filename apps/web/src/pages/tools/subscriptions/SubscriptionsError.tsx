import type { FallbackProps } from 'react-error-boundary';
import styles from './SubscriptionsPage.module.css';

export default function SubscriptionsError({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <main className={styles.main}>
      <div className={styles.emptyState}>
        <h2 className={styles.sectionHeading}>Something went wrong</h2>
        <p className={styles.emptyText}>
          {error.message ?? 'Failed to load subscriptions.'}
        </p>
        <button onClick={resetErrorBoundary} className={styles.retryButton}>
          Try again
        </button>
      </div>
    </main>
  );
}
