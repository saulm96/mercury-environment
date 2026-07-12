import type { Category } from './category';

export interface Transaction {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  categoryId: string | null;
  category?: Category | null;
  recurringTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
