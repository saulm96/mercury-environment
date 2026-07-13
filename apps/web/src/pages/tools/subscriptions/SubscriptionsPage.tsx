import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { useRecurringSync } from '@/components/transactions/RecurringSyncProvider';
import { RecurringTransactionCard } from '@/components/transactions/RecurringTransactionCard';
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon } from '@/components/icons';
import type { Subscription } from '@mercury/shared';
import SubscriptionsSkeleton from './SubscriptionsSkeleton';
import styles from './SubscriptionsPage.module.css';

const SERVICE_TYPES = ['streaming', 'ai', 'cloud', 'productivity', 'music', 'gaming', 'other'] as const;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function getMonthLabel(year: number, month: number): string {
  const date = new Date(year, month);
  const name = date.toLocaleString('es-ES', { month: 'long' });
  return `${name.charAt(0).toUpperCase() + name.slice(1)} ${year}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

interface MarkSubscriptionModalProps {
  recurringOptions: { id: string; description: string }[];
  onSubmit: (data: { recurringTransactionId: string; serviceType: string }) => Promise<void>;
  onCancel: () => void;
}

function MarkSubscriptionModal({ recurringOptions, onSubmit, onCancel }: MarkSubscriptionModalProps) {
  const [recurringTransactionId, setRecurringTransactionId] = useState('');
  const [serviceType, setServiceType] = useState('streaming');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recurringTransactionId) return;
    setIsSubmitting(true);
    try {
      await onSubmit({ recurringTransactionId, serviceType });
      onCancel();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Mark as subscription">
      <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalHeading}>Mark as subscription</h2>
          <button onClick={onCancel} className={styles.closeButton} aria-label="Close" type="button">
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="recurring-select" className={styles.formLabel}>
              Recurring transaction
            </label>
            <select
              id="recurring-select"
              className={styles.select}
              value={recurringTransactionId}
              onChange={(e) => setRecurringTransactionId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select a recurring transaction
              </option>
              {recurringOptions.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.description}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="service-type-select" className={styles.formLabel}>
              Service type
            </label>
            <select
              id="service-type-select"
              className={styles.select}
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              required
            >
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.modalActions}>
            <button type="button" onClick={onCancel} className={styles.cancelButton} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={styles.submitButton} disabled={isSubmitting || !recurringTransactionId}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditServiceTypeModalProps {
  currentServiceType: string;
  onSubmit: (data: { serviceType: string }) => Promise<void>;
  onCancel: () => void;
}

function EditServiceTypeModal({ currentServiceType, onSubmit, onCancel }: EditServiceTypeModalProps) {
  const [serviceType, setServiceType] = useState(currentServiceType);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ serviceType });
      onCancel();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Edit service type">
      <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalHeading}>Edit service type</h2>
          <button onClick={onCancel} className={styles.closeButton} aria-label="Close" type="button">
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="edit-service-type" className={styles.formLabel}>
              Service type
            </label>
            <select
              id="edit-service-type"
              className={styles.select}
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              required
            >
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.modalActions}>
            <button type="button" onClick={onCancel} className={styles.cancelButton} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DeleteConfirmModalProps {
  description: string;
  isDeleting: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

function DeleteConfirmModal({ description, isDeleting, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Delete subscription">
      <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalHeading}>Delete subscription</h2>
        <p className={styles.emptyText}>Unmark &apos;{description}&apos; as a subscription?</p>
        <div className={styles.modalActions}>
          <button type="button" onClick={onCancel} className={styles.cancelButton} disabled={isDeleting}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={styles.deleteButton} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const { ready } = useRecurringSync();
  const {
    subscriptions,
    loading,
    error,
    fetchSubscriptions,
    fetchStats,
    fetchServiceTypes,
    fetchUpcoming,
    handleCreate,
    handleUpdate,
    handleDelete,
    stats,
    serviceTypeStats,
    upcomingRenewals,
  } = useSubscriptions();
  const { recurringTransactions, fetchRecurringTransactions } = useRecurringTransactions();

  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [deletingSubscription, setDeletingSubscription] = useState<Subscription | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(() => {
    fetchSubscriptions();
    fetchStats(year, month + 1);
    fetchServiceTypes();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const future = new Date(today);
    future.setDate(today.getDate() + 30);
    const from = today.toISOString().split('T')[0];
    const to = future.toISOString().split('T')[0];
    fetchUpcoming(from, to);
  }, [fetchSubscriptions, fetchStats, fetchServiceTypes, fetchUpcoming, year, month]);

  useEffect(() => {
    if (!ready) return;
    loadData();
  }, [loadData, ready]);

  useEffect(() => {
    if (!ready) return;
    fetchRecurringTransactions();
  }, [fetchRecurringTransactions, ready]);

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

  const recurringOptions = useMemo(() => {
    const subscribedIds = new Set(subscriptions.map((s) => s.recurringTransactionId));
    return recurringTransactions
      .filter((rt) => !subscribedIds.has(rt.id))
      .map((rt) => ({ id: rt.id, description: rt.description }));
  }, [recurringTransactions, subscriptions]);

  async function confirmDelete() {
    if (!deletingSubscription) return;
    setIsDeleting(true);
    try {
      await handleDelete(deletingSubscription.id);
      setDeletingSubscription(null);
    } finally {
      setIsDeleting(false);
    }
  }

  if (!ready) {
    return <SubscriptionsSkeleton />;
  }

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Subscriptions</h1>
        <div className={styles.monthNav}>
          <button
            className={styles.navButton}
            onClick={handlePrevMonth}
            aria-label="Previous month"
            type="button"
          >
            <ArrowLeftIcon className="icon-md" />
          </button>
          <span className={styles.monthLabel}>{monthLabel}</span>
          <button
            className={styles.navButton}
            onClick={handleNextMonth}
            aria-label="Next month"
            type="button"
          >
            <ArrowRightIcon className="icon-md" />
          </button>
        </div>
        <button onClick={() => setIsMarkModalOpen(true)} className={styles.createButton} type="button">
          Mark as subscription
        </button>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <p className={styles.errorText}>{error}</p>
          <button className={styles.retryButton} onClick={loadData} type="button">
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

      {!loading && !error && stats && (
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Monthly cost</span>
            <span className={styles.summaryValue}>{formatCurrency(stats.monthlyTotal)}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Yearly cost</span>
            <span className={styles.summaryValue}>{formatCurrency(stats.yearlyTotal)}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Active</span>
            <span className={styles.summaryValue}>{stats.activeCount}</span>
            <span className={styles.summarySubtext}>subscriptions</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Next renewal</span>
            <span className={styles.summaryValue}>
              {stats.nextRenewal ? stats.nextRenewal.description : '—'}
            </span>
            {stats.nextRenewal && (
              <span className={styles.summarySubtext}>in {stats.nextRenewal.daysUntil} days</span>
            )}
          </div>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>By service type</h2>
        {serviceTypeStats.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>No subscription data for this period.</p>
          </div>
        ) : (
          <div className={styles.serviceTypeList}>
            {serviceTypeStats.map((stat) => (
              <div key={stat.serviceType} className={styles.serviceTypeItem}>
                <span className={styles.serviceTypeName}>{stat.serviceType}</span>
                <div>
                  <span className={styles.serviceTypeAmount}>{formatCurrency(stat.monthlyTotal)}</span>
                  <span className={styles.serviceTypeCount}> · {stat.count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Upcoming renewals</h2>
        {upcomingRenewals.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>No renewals in the next 30 days.</p>
          </div>
        ) : (
          <div className={styles.upcomingList}>
            {upcomingRenewals.map((subscription) => {
              const rt = subscription.recurringTransaction;
              const daysUntil = rt ? getDaysUntil(rt.nextDate) : 0;
              return (
                <div key={subscription.id} className={styles.upcomingItem}>
                  <div className={styles.upcomingInfo}>
                    <span className={styles.upcomingDescription}>
                      {rt?.description ?? subscription.id}
                    </span>
                    <span className={styles.upcomingMeta}>
                      {rt ? formatDate(rt.nextDate) : ''} · in {daysUntil} days
                    </span>
                  </div>
                  <span className={styles.upcomingAmount}>
                    {rt ? formatCurrency(rt.amount) : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>All subscriptions</h2>
        {subscriptions.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>No subscriptions yet. Mark a recurring transaction to get started.</p>
          </div>
        ) : (
          <div className={styles.subscriptionList}>
            {subscriptions.map((subscription) => {
              const rt = subscription.recurringTransaction;
              if (!rt) return null;
              return (
                <div key={subscription.id} className={styles.subscriptionCardWrapper}>
                  <span className={styles.serviceTypeBadge}>{subscription.serviceType}</span>
                  <RecurringTransactionCard
                    recurringTransaction={rt}
                    onEdit={() => setEditingSubscription(subscription)}
                    onDelete={() => setDeletingSubscription(subscription)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {isMarkModalOpen && (
        <MarkSubscriptionModal
          recurringOptions={recurringOptions}
          onSubmit={handleCreate}
          onCancel={() => setIsMarkModalOpen(false)}
        />
      )}

      {editingSubscription && (
        <EditServiceTypeModal
          currentServiceType={editingSubscription.serviceType}
          onSubmit={(data) => handleUpdate(editingSubscription.id, data)}
          onCancel={() => setEditingSubscription(null)}
        />
      )}

      {deletingSubscription && (
        <DeleteConfirmModal
          description={deletingSubscription.recurringTransaction?.description ?? deletingSubscription.id}
          isDeleting={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingSubscription(null)}
        />
      )}
    </main>
  );
}
