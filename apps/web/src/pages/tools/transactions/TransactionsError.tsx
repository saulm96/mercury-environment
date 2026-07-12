import type { FallbackProps } from 'react-error-boundary';
import styles from './TransactionsError.module.css';

export default function TransactionsError({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <main className={styles.main}>
      <p className={styles.error}>Something went wrong loading your transactions.</p>
      <button
        onClick={resetErrorBoundary}
        className={styles.button}
      >
        Try again
      </button>
    </main>
  );
}
