import type { Category } from './category';

export interface Budget {
  id: string;
  userId: string;
  name: string;
  value: number;
  period: 'monthly';
  categories?: Category[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetStats {
  period: { year: number; month: number };
  totalIncome: number;
  totalExpenses: number;
  totalAllocated: number;
  estimatedSavings: number;
  actualSavings: number;
  budgets: BudgetStat[];
}

export interface BudgetStat {
  id: string;
  name: string;
  value: number;
  allocated: number;
  spent: number;
  remaining: number;
  progress: number;
  status: 'under' | 'warning' | 'over';
  categories: Category[];
}
