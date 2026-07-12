import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
  HasMany,
  Index,
} from 'sequelize-typescript';
import User from './user.model';
import Category from './category.model';
import Transaction from './transaction.model';
import RecurringSkip from './recurring-skip.model';

@Table({
  tableName: 'recurring_transactions',
  timestamps: true,
  paranoid: true,
})
export default class RecurringTransaction extends Model {
  @Column({ type: DataType.CHAR(36), defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => User)
  @Index({ name: 'idx_recurring_transactions_user_id' })
  @Column({ type: DataType.CHAR(36), allowNull: false })
  userId!: string;

  @BelongsTo(() => User)
  user!: User;

  @ForeignKey(() => Category)
  @Index({ name: 'idx_recurring_transactions_category_id' })
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

  @Column({ type: DataType.ENUM('daily', 'weekly', 'monthly', 'yearly'), allowNull: false })
  frequency!: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 1 })
  interval!: number;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  startDate!: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  endDate!: string | null;

  @Index({ name: 'idx_recurring_transactions_next_date' })
  @Column({ type: DataType.DATEONLY, allowNull: false })
  nextDate!: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  dayOfMonth!: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  dayOfWeek!: number | null;

  @Column({ type: DataType.ENUM('active', 'paused', 'cancelled'), allowNull: false, defaultValue: 'active' })
  status!: 'active' | 'paused' | 'cancelled';

  @HasMany(() => Transaction)
  transactions!: Transaction[];

  @HasMany(() => RecurringSkip)
  skips!: RecurringSkip[];
}
