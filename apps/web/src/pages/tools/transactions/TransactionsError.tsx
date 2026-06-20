import styles from './TransactionsError.module.css';

export default function TransactionsError() {
  return (
    <main className={styles.main}>
      <p className={styles.error}>Something went wrong loading your transactions.</p>
      <button
        onClick={() => window.location.reload()}
        className={styles.button}
      >
        Try again
      </button>
    </main>
  );
}
