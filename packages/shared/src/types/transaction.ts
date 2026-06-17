export interface Transaction {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
}
