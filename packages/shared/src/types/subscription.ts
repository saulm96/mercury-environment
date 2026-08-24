import type { RecurringTransaction } from './recurring-transaction';

export type ServiceType =
  | 'streaming'
  | 'ai'
  | 'cloud'
  | 'productivity'
  | 'music'
  | 'gaming'
  | 'other';

export interface Subscription {
  id: string;
  userId: string;
  recurringTransactionId: string;
  serviceType: ServiceType;
  recurringTransaction?: RecurringTransaction | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionSummary {
  monthlyTotal: number;
  yearlyTotal: number;
  activeCount: number;
  nextRenewal: { description: string; date: string; daysUntil: number } | null;
}

export interface ServiceTypeStat {
  serviceType: string;
  monthlyTotal: number;
  count: number;
}
