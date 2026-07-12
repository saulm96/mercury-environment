import { Column, DataType, Model, Table, ForeignKey, BelongsTo, BelongsToMany, Index } from 'sequelize-typescript';
import User from './user.model';
import Category from './category.model';
import BudgetCategory from './budget-category.model';

@Table({
  tableName: 'budgets',
  timestamps: true,
  paranoid: true,
  indexes: [
    { name: 'idx_budgets_user_name', unique: true, fields: ['userId', 'name'] },
  ],
})
export default class Budget extends Model {
  @Column({ type: DataType.CHAR(36), defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => User)
  @Index({ name: 'idx_budgets_user_id' })
  @Column({ type: DataType.CHAR(36), allowNull: false })
  userId!: string;

  @BelongsTo(() => User)
  user!: User;

  @BelongsToMany(() => Category, () => BudgetCategory)
  categories!: Category[];

  @Column({ type: DataType.STRING(100), allowNull: false })
  name!: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  value!: number;

  @Column({ type: DataType.ENUM('monthly'), allowNull: false, defaultValue: 'monthly' })
  period!: 'monthly';
}
