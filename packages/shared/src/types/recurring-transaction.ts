import type { Category } from './category';

export interface RecurringTransaction {
  id: string;
  userId: string;
  categoryId: string | null;
  category?: Category | null;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  startDate: string;
  endDate: string | null;
  nextDate: string;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  status: 'active' | 'paused' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringSkip {
  id: string;
  recurringTransactionId: string;
  occurrenceDate: string;
  createdAt: Date;
  updatedAt: Date;
}
