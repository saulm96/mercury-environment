import styles from './SubscriptionsPage.module.css';

export default function SubscriptionsSkeleton() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div className={styles.skeletonLineLong} style={{ width: 180, height: 36 }} />
        <div className={styles.skeletonLineShort} style={{ width: 130, height: 40 }} />
      </div>
      <div className={styles.skeletonGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard}>
            <div className={styles.skeletonLineShort} />
            <div className={styles.skeletonLineLong} />
          </div>
        ))}
      </div>
      <div className={styles.section}>
        <div className={styles.skeletonLineShort} style={{ width: 160, height: 28, marginBottom: 16 }} />
        <div className={styles.serviceTypeList}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonLineLong} />
            </div>
          ))}
        </div>
      </div>
      <div className={styles.section}>
        <div className={styles.skeletonLineShort} style={{ width: 180, height: 28, marginBottom: 16 }} />
        <div className={styles.upcomingList}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonLineLong} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
