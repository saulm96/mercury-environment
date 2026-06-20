export interface SeedCategory {
  name: string;
  color: string;
  type: 'income' | 'expense';
  isFallback: boolean;
}

export const EXPENSE_CATEGORIES: SeedCategory[] = [
  { name: 'Food', color: '#FF6B6B', type: 'expense', isFallback: false },
  { name: 'Transport', color: '#4ECDC4', type: 'expense', isFallback: false },
  { name: 'Entertainment', color: '#FFE66D', type: 'expense', isFallback: false },
  { name: 'Health', color: '#95E1D3', type: 'expense', isFallback: false },
  { name: 'Housing', color: '#AA96DA', type: 'expense', isFallback: false },
  { name: 'Shopping', color: '#FCBAD3', type: 'expense', isFallback: false },
  { name: 'Others', color: '#B0BEC5', type: 'expense', isFallback: true },
];

export const INCOME_CATEGORIES: SeedCategory[] = [
  { name: 'Salary', color: '#2ECC71', type: 'income', isFallback: false },
  { name: 'Freelance', color: '#3498DB', type: 'income', isFallback: false },
  { name: 'Investments', color: '#9B59B6', type: 'income', isFallback: false },
  { name: 'Gifts', color: '#F39C12', type: 'income', isFallback: false },
  { name: 'Other Income', color: '#B0BEC5', type: 'income', isFallback: true },
];

export const SEED_CATEGORIES: SeedCategory[] = [
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
];
