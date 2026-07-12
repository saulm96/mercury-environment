import styles from './RecurringSkeleton.module.css';

export default function RecurringSkeleton() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div className={styles.headingSkeleton} />
        <div className={styles.buttonSkeleton} />
      </div>
      <div className={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.card}>
            <div className={styles.cardTop} />
            <div className={styles.cardMiddle} />
            <div className={styles.cardBottom} />
          </div>
        ))}
      </div>
    </main>
  );
}
