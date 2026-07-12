import { Column, DataType, Model, Table, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import User from './user.model';
import Category from './category.model';
import RecurringTransaction from './recurring-transaction.model';

@Table({
  tableName: 'transactions',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      name: 'idx_transactions_recurring_date',
      unique: true,
      fields: ['recurringTransactionId', 'date'],
    },
  ],
})
export default class Transaction extends Model {
  @Column({ type: DataType.CHAR(36), defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => User)
  @Index({ name: 'idx_transactions_user_id' })
  @Column({ type: DataType.CHAR(36), allowNull: false })
  userId!: string;

  @BelongsTo(() => User)
  user!: User;

  @ForeignKey(() => Category)
  @Index({ name: 'idx_transactions_category_id' })
  @Column({ type: DataType.CHAR(36), allowNull: true })
  categoryId!: string | null;

  @BelongsTo(() => Category)
  category!: Category | null;

  @Column({ type: DataType.ENUM('income', 'expense'), allowNull: false })
  type!: 'income' | 'expense';

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  amount!: number;

  @Column({ type: DataType.STRING(255), allowNull: false })
  description!: string;

  @Index({ name: 'idx_transactions_date' })
  @Column({ type: DataType.DATEONLY, allowNull: false })
  date!: string;

  @ForeignKey(() => RecurringTransaction)
  @Index({ name: 'idx_transactions_recurring_id' })
  @Column({ type: DataType.CHAR(36), allowNull: true })
  recurringTransactionId!: string | null;

  @BelongsTo(() => RecurringTransaction)
  recurringTransaction!: RecurringTransaction | null;
}
