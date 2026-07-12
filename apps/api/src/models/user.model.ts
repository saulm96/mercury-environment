import { Column, DataType, Model, Table, HasMany } from 'sequelize-typescript';
import Transaction from './transaction.model';
import RecurringTransaction from './recurring-transaction.model';

@Table({ tableName: 'users', timestamps: true, paranoid: true })
export default class User extends Model {
  @Column({ type: DataType.CHAR(36), defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  email!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  name!: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  provider!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  providerId!: string | null;

  @HasMany(() => Transaction)
  transactions!: Transaction[];

  @HasMany(() => RecurringTransaction)
  recurringTransactions!: RecurringTransaction[];
}
