import { Column, DataType, Model, Table, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import RecurringTransaction from './recurring-transaction.model';

@Table({
  tableName: 'recurring_skips',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      name: 'idx_skips_recurring_date',
      unique: true,
      fields: ['recurringTransactionId', 'occurrenceDate'],
    },
  ],
})
export default class RecurringSkip extends Model {
  @Column({ type: DataType.CHAR(36), defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => RecurringTransaction)
  @Index({ name: 'idx_skips_recurring_id' })
  @Column({ type: DataType.CHAR(36), allowNull: false })
  recurringTransactionId!: string;

  @BelongsTo(() => RecurringTransaction)
  recurringTransaction!: RecurringTransaction;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  occurrenceDate!: string;
}
