export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  type: 'income' | 'expense';
  isFallback: boolean;
  createdAt: Date;
  updatedAt: Date;
}
