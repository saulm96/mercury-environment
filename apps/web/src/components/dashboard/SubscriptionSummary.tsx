import { Link } from 'react-router-dom';
import styles from './SubscriptionSummary.module.css';

interface SubscriptionSummaryWidgetProps {
  monthlyTotal: number;
  activeCount: number;
  nextRenewal: { description: string; daysUntil: number } | null;
}

function formatCurrency(amount: number): string {
  return `${Number(amount).toFixed(2)}€`;
}

export function SubscriptionSummaryWidget({
  monthlyTotal,
  activeCount,
  nextRenewal,
}: SubscriptionSummaryWidgetProps) {
  return (
    <Link to="/economy/subscriptions" className={styles.card}>
      <div className={styles.content}>
        <div className={styles.topRow}>
          <span className={styles.label}>Subscriptions</span>
          <span className={styles.value}>{formatCurrency(monthlyTotal)}</span>
        </div>
        <p className={styles.meta}>{activeCount} active</p>
        {nextRenewal && (
          <p className={styles.nextRenewal}>
            Next: {nextRenewal.description} in {nextRenewal.daysUntil} days
          </p>
        )}
      </div>
      <span className={styles.arrow}>View →</span>
    </Link>
  );
}
