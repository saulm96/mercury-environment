import Budget from '../models/budget.model';
import Category from '../models/category.model';
import Transaction from '../models/transaction.model';
import { NotFoundError, ForbiddenError } from '../middleware/error.middleware';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';
import type { BudgetStats, BudgetStat } from '@mercury/shared';

export class BudgetsService {
  async findAll(userId: string): Promise<Budget[]> {
    return Budget.findAll({ where: { userId }, include: [Category] });
  }

  async findById(id: string, userId: string): Promise<Budget> {
    const budget = await Budget.findOne({ where: { id, userId }, include: [Category] });
    if (!budget) throw new NotFoundError(`Budget ${id} not found`);
    return budget;
  }

  async create(
    userId: string,
    data: { name: string; type: 'percentage' | 'fixed'; value: number; period?: string; categoryIds: string[] },
  ): Promise<Budget> {
    return sequelize.transaction(async (t) => {
      const budget = await Budget.create(
        { name: data.name, type: data.type, value: data.value, period: data.period, userId },
        { transaction: t },
      );

      const categories = await Category.findAll({
        where: { id: data.categoryIds, userId },
        transaction: t,
      });

      if (categories.length !== data.categoryIds.length) {
        throw new ForbiddenError('One or more categories do not belong to this user');
      }

      await (budget as any).$add('categories', categories, { transaction: t });

      await budget.reload({ include: [Category], transaction: t });
      return budget;
    });
  }

  async update(
    id: string,
    userId: string,
    data: { name?: string; type?: 'percentage' | 'fixed'; value?: number; categoryIds?: string[] },
  ): Promise<Budget> {
    return sequelize.transaction(async (t) => {
      const budget = await Budget.findOne({ where: { id, userId }, transaction: t });
      if (!budget) throw new NotFoundError(`Budget ${id} not found`);

      if (data.name !== undefined) budget.name = data.name;
      if (data.type !== undefined) budget.type = data.type;
      if (data.value !== undefined) budget.value = data.value;
      await budget.save({ transaction: t });

      if (data.categoryIds !== undefined) {
        const categories = await Category.findAll({
          where: { id: data.categoryIds, userId },
          transaction: t,
        });

        if (categories.length !== data.categoryIds.length) {
          throw new ForbiddenError('One or more categories do not belong to this user');
        }

        await (budget as any).$set('categories', categories, { transaction: t });
      }

      await budget.reload({ include: [Category], transaction: t });
      return budget;
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const budget = await Budget.findOne({ where: { id, userId } });
    if (!budget) throw new NotFoundError(`Budget ${id} not found`);
    await budget.destroy();
  }

  async getStats(userId: string, year: number, month: number): Promise<BudgetStats> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const rawTotalIncome = await Transaction.sum('amount', {
      where: { userId, type: 'income', date: { [Op.between]: [startDate, endDate] } },
    });
    const totalIncome = Number(rawTotalIncome) || 0;

    const rawTotalExpenses = await Transaction.sum('amount', {
      where: { userId, type: 'expense', date: { [Op.between]: [startDate, endDate] } },
    });
    const totalExpenses = Number(rawTotalExpenses) || 0;

    const expenseTransactions = await Transaction.findAll({
      where: { userId, type: 'expense', date: { [Op.between]: [startDate, endDate] } },
      attributes: ['categoryId', 'amount'],
    });

    const budgets = await Budget.findAll({ where: { userId }, include: [Category] });

    const budgetStats: BudgetStat[] = budgets.map((budget) => {
      const categoryIds = budget.categories?.map((c) => c.id) || [];
      const allocated = budget.type === 'percentage'
        ? totalIncome * (Number(budget.value) / 100)
        : Number(budget.value);

      const spent = expenseTransactions
        .filter((tx) => categoryIds.includes(tx.categoryId || ''))
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      const remaining = allocated - spent;
      const progress = allocated > 0 ? (spent / allocated) * 100 : 0;
      const status: BudgetStat['status'] = progress >= 100 ? 'over' : progress >= 80 ? 'warning' : 'under';

      return {
        id: budget.id,
        name: budget.name,
        type: budget.type,
        value: Number(budget.value),
        allocated,
        spent,
        remaining,
        progress,
        status,
        categories: budget.categories?.map((c) => c.toJSON() as any) || [],
      };
    });

    const totalAllocated = budgetStats.reduce((sum, b) => sum + b.allocated, 0);
    const estimatedSavings = totalIncome - totalAllocated;
    const actualSavings = totalIncome - totalExpenses;

    return {
      period: { year, month },
      totalIncome,
      totalExpenses,
      totalAllocated,
      estimatedSavings,
      actualSavings,
      budgets: budgetStats,
    };
  }
}
