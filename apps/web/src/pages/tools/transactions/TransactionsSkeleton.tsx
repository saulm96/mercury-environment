import styles from './TransactionsSkeleton.module.css';

export default function TransactionsSkeleton() {
  return (
    <main className={styles.main}>
      <div className={styles.title} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={styles.row} />
      ))}
    </main>
  );
}
