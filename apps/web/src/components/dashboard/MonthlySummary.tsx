import styles from './MonthlySummary.module.css';

interface MonthlySummaryProps {
  totalIncome: number;
  totalExpenses: number;
  estimatedSavings: number;
  actualSavings: number;
}

function formatCurrency(amount: number): string {
  return `${Number(amount).toFixed(2)}€`;
}

export function MonthlySummary({ totalIncome, totalExpenses, estimatedSavings, actualSavings }: MonthlySummaryProps) {
  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <span className={styles.label}>Total Income</span>
        <span className={styles.value}>{formatCurrency(totalIncome)}</span>
      </div>
      <div className={styles.card}>
        <span className={styles.label}>Total Expenses</span>
        <span className={styles.value}>{formatCurrency(totalExpenses)}</span>
      </div>
      <div className={styles.card}>
        <span className={styles.label}>Est. Savings</span>
        <span className={styles.value}>{formatCurrency(estimatedSavings)}</span>
      </div>
      <div className={styles.card}>
        <span className={styles.label}>Actual Savings</span>
        <span
          className={styles.value}
          style={{ color: actualSavings >= 0 ? '#22C55E' : '#EF4444' }}
        >
          {formatCurrency(actualSavings)}
        </span>
      </div>
    </div>
  );
}
