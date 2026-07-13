import { useState, useEffect, useCallback } from 'react';
import { useBudgets } from '@/hooks/useBudgets';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useRecurringSync } from '@/components/transactions/RecurringSyncProvider';
import { MonthlySummary } from '@/components/dashboard/MonthlySummary';
import { SubscriptionSummaryWidget } from '@/components/dashboard/SubscriptionSummary';
import { BudgetProgress } from '@/components/dashboard/BudgetProgress';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/icons';
import DashboardSkeleton from './DashboardSkeleton';
import styles from './DashboardPage.module.css';

function getMonthLabel(year: number, month: number): string {
  const date = new Date(year, month);
  const name = date.toLocaleString('es-ES', { month: 'long' });
  return `${name.charAt(0).toUpperCase() + name.slice(1)} ${year}`;
}

export default function DashboardPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const { ready } = useRecurringSync();
  const { stats, loading, error, fetchStats } = useBudgets();
  const {
    stats: subscriptionStats,
    fetchStats: fetchSubscriptionStats,
  } = useSubscriptions();

  const loadStats = useCallback(() => {
    fetchStats(year, month + 1);
    fetchSubscriptionStats(year, month + 1);
  }, [fetchStats, fetchSubscriptionStats, year, month]);

  useEffect(() => {
    if (!ready) return;
    loadStats();
  }, [loadStats, ready]);

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const monthLabel = getMonthLabel(year, month);

  const summaryData = stats
    ? {
        totalIncome: stats.totalIncome,
        totalExpenses: stats.totalExpenses,
        estimatedSavings: stats.estimatedSavings,
        actualSavings: stats.actualSavings,
      }
    : null;

  const budgetStats = stats?.budgets ?? [];

  if (!ready) {
    return <DashboardSkeleton />;
  }

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Dashboard</h1>
        <div className={styles.monthNav}>
          <button
            className={styles.navButton}
            onClick={handlePrevMonth}
            aria-label="Previous month"
          >
            <ArrowLeftIcon className="icon-md" />
          </button>
          <span className={styles.monthLabel}>{monthLabel}</span>
          <button
            className={styles.navButton}
            onClick={handleNextMonth}
            aria-label="Next month"
          >
            <ArrowRightIcon className="icon-md" />
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <p className={styles.errorText}>{error}</p>
          <button className={styles.retryButton} onClick={loadStats}>
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonLineShort} />
              <div className={styles.skeletonLineLong} />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && summaryData && (
        <MonthlySummary
          totalIncome={summaryData.totalIncome}
          totalExpenses={summaryData.totalExpenses}
          estimatedSavings={summaryData.estimatedSavings}
          actualSavings={summaryData.actualSavings}
        />
      )}

      {subscriptionStats && subscriptionStats.activeCount > 0 && (
        <div className={styles.subscriptionSummarySection}>
          <SubscriptionSummaryWidget
            monthlyTotal={subscriptionStats.monthlyTotal}
            activeCount={subscriptionStats.activeCount}
            nextRenewal={subscriptionStats.nextRenewal}
          />
        </div>
      )}

      <section className={styles.budgetsSection}>
        <h2 className={styles.sectionHeading}>Budgets</h2>

        {!loading && !error && budgetStats.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>No budgets found for this month.</p>
          </div>
        )}

        {!loading && !error && budgetStats.length > 0 && (
          <div className={styles.budgetsList}>
            {budgetStats.map((budget) => (
              <BudgetProgress
                key={budget.id}
                name={budget.name}
                value={budget.value}
                allocated={budget.allocated}
                spent={budget.spent}
                remaining={budget.remaining}
                progress={budget.progress}
                status={budget.status}
                categories={budget.categories}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
