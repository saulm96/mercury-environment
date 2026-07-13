import { Column, DataType, Model, Table, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import User from './user.model';
import RecurringTransaction from './recurring-transaction.model';

@Table({
  tableName: 'subscriptions',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      name: 'idx_subscriptions_recurring_id',
      unique: true,
      fields: ['recurringTransactionId'],
    },
  ],
})
export default class Subscription extends Model {
  @Column({ type: DataType.CHAR(36), defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => User)
  @Index({ name: 'idx_subscriptions_user_id' })
  @Column({ type: DataType.CHAR(36), allowNull: false })
  userId!: string;

  @BelongsTo(() => User)
  user!: User;

  @ForeignKey(() => RecurringTransaction)
  @Column({ type: DataType.CHAR(36), allowNull: false })
  recurringTransactionId!: string;

  @BelongsTo(() => RecurringTransaction)
  recurringTransaction!: RecurringTransaction;

  @Column({
    type: DataType.ENUM('streaming', 'ai', 'cloud', 'productivity', 'music', 'gaming', 'other'),
    allowNull: false,
  })
  serviceType!:
    | 'streaming'
    | 'ai'
    | 'cloud'
    | 'productivity'
    | 'music'
    | 'gaming'
    | 'other';
}
