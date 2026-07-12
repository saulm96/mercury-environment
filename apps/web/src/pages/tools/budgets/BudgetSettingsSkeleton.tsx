import styles from './BudgetSettingsSkeleton.module.css';

export default function BudgetSettingsSkeleton() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div className={styles.headingSkeleton} />
        <div className={styles.buttonSkeleton} />
      </div>
      <div className={styles.skeletonList}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard}>
            <div className={styles.skeletonTop} />
            <div className={styles.skeletonBottom} />
          </div>
        ))}
      </div>
    </main>
  );
}
