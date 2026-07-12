import type { RecurringTransaction } from '@mercury/shared';
import { RecurringTransactionCard } from './RecurringTransactionCard';
import { EmptyState } from './EmptyState';
import styles from './RecurringTransactionCardList.module.css';

interface RecurringTransactionCardListProps {
  recurringTransactions: RecurringTransaction[];
  loading: boolean;
  error: string | null;
  onEdit: (rt: RecurringTransaction) => void;
  onDelete: (rt: RecurringTransaction) => void;
  onCreateClick: () => void;
}

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonIconGroup}>
          <div className={styles.skeletonAvatar} />
          <div className={styles.skeletonDescription} />
        </div>
        <div className={styles.skeletonIcon} />
      </div>
      <div className={styles.skeletonBody}>
        <div className={styles.skeletonDetail} />
        <div className={styles.skeletonDetail} />
      </div>
      <div className={styles.skeletonFooter}>
        <div className={styles.skeletonBadge} />
        <div className={styles.skeletonAmount} />
      </div>
    </div>
  );
}

export function RecurringTransactionCardList({
  recurringTransactions,
  loading,
  error,
  onEdit,
  onDelete,
  onCreateClick,
}: RecurringTransactionCardListProps) {
  if (loading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p className={styles.errorText}>{error}</p>
        <p className={styles.errorSubtext}>Please try refreshing the page.</p>
      </div>
    );
  }

  if (recurringTransactions.length === 0) {
    return <EmptyState onCreateClick={onCreateClick} />;
  }

  return (
    <div className={styles.grid}>
      {recurringTransactions.map((rt) => (
        <RecurringTransactionCard
          key={rt.id}
          recurringTransaction={rt}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
