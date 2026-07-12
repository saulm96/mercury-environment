import Category from '../models/category.model';
import Transaction from '../models/transaction.model';
import RecurringTransaction from '../models/recurring-transaction.model';
import { NotFoundError, ForbiddenError } from '../middleware/error.middleware';
import { sequelize } from '../config/database';
import { Transaction as SeqTransaction } from 'sequelize';

export class CategoriesService {
  async findAll(userId: string): Promise<Category[]> {
    return Category.findAll({ where: { userId } });
  }

  async findById(id: string, userId: string): Promise<Category> {
    const category = await Category.findOne({ where: { id, userId } });
    if (!category) throw new NotFoundError(`Category ${id} not found`);
    return category;
  }

  async create(userId: string, data: { name: string; color?: string | null; type: 'income' | 'expense' }): Promise<Category> {
    const existing = await Category.findOne({ where: { userId, name: data.name } });
    if (existing) throw new ForbiddenError(`Category "${data.name}" already exists`);

    return Category.create({ ...data, userId });
  }

  async update(id: string, userId: string, data: { name?: string; color?: string | null }): Promise<Category> {
    const category = await this.findById(id, userId);

    if (data.name && data.name !== category.name) {
      const duplicate = await Category.findOne({ where: { userId, name: data.name } });
      if (duplicate) throw new ForbiddenError(`Category "${data.name}" already exists`);
    }

    await category.update(data);
    return category;
  }

  async delete(id: string, userId: string): Promise<void> {
    const category = await Category.findOne({ where: { id, userId } });
    if (!category) throw new NotFoundError(`Category ${id} not found`);
    if (category.isFallback) throw new ForbiddenError('Cannot delete the fallback category');

    await sequelize.transaction(async (t: SeqTransaction) => {
      const fallback = await Category.findOne({
        where: { userId, isFallback: true, type: category.type },
        transaction: t,
      });
      if (!fallback) throw new NotFoundError(`Fallback category for type ${category.type} not found`);

      await Transaction.update(
        { categoryId: fallback.id },
        { where: { userId, categoryId: id }, transaction: t },
      );

      await RecurringTransaction.update(
        { categoryId: fallback.id },
        { where: { userId, categoryId: id }, transaction: t },
      );

      await category.destroy({ transaction: t });
    });
  }
}
