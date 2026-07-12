import type { Category } from '@mercury/shared';
import styles from './BudgetProgress.module.css';

interface BudgetProgressProps {
  name: string;
  value: number;
  allocated: number;
  spent: number;
  remaining: number;
  progress: number;
  status: 'under' | 'warning' | 'over';
  categories: Category[];
}

const STATUS_COLORS: Record<string, string> = {
  under: '#22C55E',
  warning: '#F59E0B',
  over: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  under: 'On track',
  warning: 'Warning',
  over: 'Over budget',
};

function formatCurrency(amount: number): string {
  return `${Number(amount).toFixed(2)}€`;
}

export function BudgetProgress({ name, value, allocated, spent, progress, status, categories }: BudgetProgressProps) {
  const barWidth = Math.min(progress, 100);
  const barColor = STATUS_COLORS[status] ?? '#22C55E';
  const isOver = status === 'over';

  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{name}</span>
          <span className={styles.badge}>{formatCurrency(value)}</span>
        </div>
        <span className={styles.allocated}>{formatCurrency(allocated)}</span>
      </div>

      <div className={styles.barTrack}>
        <div
          className={`${styles.barFill} ${isOver ? styles.barOver : ''}`}
          style={{ width: `${barWidth}%`, backgroundColor: barColor }}
        />
      </div>

      <div className={styles.bottomRow}>
        <span className={styles.spentLabel}>
          {formatCurrency(spent)} / {formatCurrency(allocated)}
        </span>
        <span className={styles.statusLabel} style={{ color: barColor }}>
          {STATUS_LABELS[status] ?? status} ({Math.round(progress)}%)
        </span>
      </div>

      {categories && categories.length > 0 && (
        <div className={styles.categories}>
          {categories.map((cat) => (
            <span key={cat.id} className={styles.categoryChip}>
              {cat.color && (
                <span
                  className={styles.categoryDot}
                  style={{ backgroundColor: cat.color }}
                />
              )}
              {cat.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
