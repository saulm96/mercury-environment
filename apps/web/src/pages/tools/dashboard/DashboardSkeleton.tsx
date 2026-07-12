import styles from './DashboardSkeleton.module.css';

export default function DashboardSkeleton() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div className={styles.headingSkeleton} />
        <div className={styles.navSkeleton} />
      </div>
      <div className={styles.skeletonGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard}>
            <div className={styles.skeletonLineShort} />
            <div className={styles.skeletonLineLong} />
          </div>
        ))}
      </div>
      <div className={styles.sectionSkeleton}>
        <div className={styles.sectionHeadingSkeleton} />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.budgetSkeletonCard}>
            <div className={styles.budgetSkeletonTop} />
            <div className={styles.budgetSkeletonBar} />
            <div className={styles.budgetSkeletonBottom} />
          </div>
        ))}
      </div>
    </main>
  );
}
