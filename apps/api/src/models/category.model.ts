import { Column, DataType, Model, Table, ForeignKey, BelongsTo, HasMany, Index } from 'sequelize-typescript';
import User from './user.model';
import Transaction from './transaction.model';

@Table({
  tableName: 'categories',
  timestamps: true,
  paranoid: true,
  indexes: [
    { name: 'idx_categories_user_name', unique: true, fields: ['userId', 'name'] },
  ],
})
export default class Category extends Model {
  @Column({ type: DataType.CHAR(36), defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => User)
  @Index({ name: 'idx_categories_user_id' })
  @Column({ type: DataType.CHAR(36), allowNull: false })
  userId!: string;

  @BelongsTo(() => User)
  user!: User;

  @HasMany(() => Transaction)
  transactions!: Transaction[];

  @Column({ type: DataType.STRING(100), allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING(7), allowNull: true })
  color!: string | null;

  @Column({ type: DataType.ENUM('income', 'expense'), allowNull: false })
  type!: 'income' | 'expense';

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isFallback!: boolean;
}
