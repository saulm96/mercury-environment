import { Column, DataType, Model, Table, ForeignKey } from 'sequelize-typescript';
import Budget from './budget.model';
import Category from './category.model';

@Table({
  tableName: 'budget_categories',
  timestamps: true,
  paranoid: true,
  indexes: [
    { name: 'idx_budget_categories_unique', unique: true, fields: ['budgetId', 'categoryId'] },
  ],
})
export default class BudgetCategory extends Model {
  @Column({ type: DataType.CHAR(36), defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => Budget)
  @Column({ type: DataType.CHAR(36), allowNull: false })
  budgetId!: string;

  @ForeignKey(() => Category)
  @Column({ type: DataType.CHAR(36), allowNull: false })
  categoryId!: string;
}
