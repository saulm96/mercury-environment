import type { Transaction } from '@mercury/shared';
import { TransactionCard } from './TransactionCard';
import { EmptyState } from './EmptyState';
import styles from './TransactionCardList.module.css';

interface TransactionCardListProps {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  onEdit: (tx: Transaction) => void;
  onCreateClick: () => void;
}

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonIconGroup}>
          <div className={styles.skeletonAvatar} />
          <div className={styles.skeletonDate} />
        </div>
        <div className={styles.skeletonIcon} />
      </div>
      <div className={styles.skeletonDescription} />
      <div className={styles.skeletonFooter}>
        <div className={styles.skeletonBadge} />
        <div className={styles.skeletonAmount} />
      </div>
    </div>
  );
}

export function TransactionCardList({
  transactions,
  loading,
  error,
  onEdit,
  onCreateClick,
}: TransactionCardListProps) {
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

  if (transactions.length === 0) {
    return <EmptyState onCreateClick={onCreateClick} />;
  }

  return (
    <div className={styles.grid}>
      {transactions.map((tx) => (
        <TransactionCard key={tx.id} transaction={tx} onEdit={onEdit} />
      ))}
    </div>
  );
}
