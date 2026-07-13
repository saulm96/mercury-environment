import { Op } from 'sequelize';
import RecurringTransaction from '../models/recurring-transaction.model';
import RecurringSkip from '../models/recurring-skip.model';
import Transaction from '../models/transaction.model';
import Category from '../models/category.model';
import Subscription from '../models/subscription.model';
import { NotFoundError } from '../middleware/error.middleware';
import { logger } from '../config/logger';
import { sequelize } from '../config/database';
import type { RecurringSkip as RecurringSkipType } from '@mercury/shared';

export class RecurringTransactionsService {
  async findAll(userId: string): Promise<RecurringTransaction[]> {
    return RecurringTransaction.findAll({ where: { userId }, include: [Category] });
  }

  async findById(id: string, userId: string): Promise<RecurringTransaction> {
    const recurring = await RecurringTransaction.findOne({ where: { id, userId }, include: [Category] });
    if (!recurring) throw new NotFoundError(`Recurring transaction ${id} not found`);
    return recurring;
  }

  async create(
    userId: string,
    data: Partial<RecurringTransaction> & { date?: string },
  ): Promise<RecurringTransaction> {
    const { date, ...rest } = data;
    const startDate = date ?? (rest as unknown as { startDate?: string }).startDate;

    const recurring = await RecurringTransaction.create({
      ...rest,
      userId,
      startDate,
      nextDate: startDate,
    } as any);

    return recurring.reload({ include: [Category] });
  }

  async update(
    id: string,
    userId: string,
    data: Partial<RecurringTransaction> & { date?: string },
  ): Promise<RecurringTransaction> {
    const recurring = await this.findById(id, userId);
    const { date, ...rest } = data;
    const updateData: Partial<RecurringTransaction> = { ...rest };

    if (date !== undefined) {
      (updateData as unknown as { startDate?: string }).startDate = date;
    }

    await recurring.update(updateData);
    return recurring.reload({ include: [Category] });
  }

  async delete(id: string, userId: string): Promise<void> {
    const recurring = await this.findById(id, userId);
    await recurring.destroy();
    await Subscription.destroy({ where: { recurringTransactionId: id } });
  }

  async skipDate(id: string, userId: string, occurrenceDate: string): Promise<RecurringSkipType> {
    await this.findById(id, userId);

    const [skip] = await RecurringSkip.findOrCreate({
      where: { recurringTransactionId: id, occurrenceDate },
      defaults: { recurringTransactionId: id, occurrenceDate },
    });

    return skip.toJSON() as RecurringSkipType;
  }

  async unskipDate(id: string, userId: string, occurrenceDate: string): Promise<void> {
    await this.findById(id, userId);

    const skip = await RecurringSkip.findOne({
      where: { recurringTransactionId: id, occurrenceDate },
    });
    if (!skip) throw new NotFoundError(`Skip for ${occurrenceDate} not found`);

    await skip.destroy();
  }

  async processDue(userId: string): Promise<{ generated: number; errors: string[] }> {
    let generated = 0;
    const errors: string[] = [];

    try {
      const today = this.getToday();
      const recurrings = await RecurringTransaction.findAll({
        where: {
          userId,
          status: 'active',
          nextDate: { [Op.lte]: today },
        },
      });

      for (const recurring of recurrings) {
        try {
          const count = await sequelize.transaction(async (t) => {
            let localGenerated = 0;
            let currentDate = recurring.nextDate;
            const {
              id,
              type,
              amount,
              description,
              categoryId,
              frequency,
              interval,
              dayOfMonth,
              dayOfWeek,
              endDate,
            } = recurring;

            while (currentDate <= today && (!endDate || currentDate <= endDate)) {
              const skip = await RecurringSkip.findOne({
                where: { recurringTransactionId: id, occurrenceDate: currentDate },
                paranoid: false,
                transaction: t,
              });

              const existing = await Transaction.findOne({
                where: { recurringTransactionId: id, date: currentDate },
                paranoid: false,
                transaction: t,
              });

              if (!skip && !existing) {
                await Transaction.create(
                  {
                    userId,
                    type,
                    amount,
                    description,
                    date: currentDate,
                    categoryId,
                    recurringTransactionId: id,
                  } as any,
                  { transaction: t },
                );
                localGenerated++;
              }

              currentDate = this.computeNextDate(
                currentDate,
                frequency,
                interval,
                dayOfMonth,
                dayOfWeek,
              );
            }

            await recurring.update({ nextDate: currentDate }, { transaction: t });
            return localGenerated;
          });

          generated += count;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push(message);
          logger.error({ err, recurringId: recurring.id }, 'Error processing recurring transaction');
        }
      }

      return { generated, errors };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err }, 'Error processing due recurring transactions');
      return { generated, errors: [...errors, message] };
    }
  }

  private getToday(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private computeNextDate(
    currentDate: string,
    frequency: string,
    interval: number,
    dayOfMonth: number | null,
    dayOfWeek: number | null,
  ): string {
    const d = new Date(`${currentDate}T12:00:00Z`);

    switch (frequency) {
      case 'daily': {
        d.setUTCDate(d.getUTCDate() + interval);
        break;
      }
      case 'weekly': {
        if (dayOfWeek !== null) {
          const targetDay = dayOfWeek % 7;
          const currentDay = d.getUTCDay();
          const diff = targetDay - currentDay;
          d.setUTCDate(d.getUTCDate() + diff);

          if (d.toISOString().split('T')[0] <= currentDate) {
            d.setUTCDate(d.getUTCDate() + interval * 7);
          }
        } else {
          d.setUTCDate(d.getUTCDate() + interval * 7);
        }
        break;
      }
      case 'monthly': {
        d.setUTCMonth(d.getUTCMonth() + interval);
        if (dayOfMonth !== null) {
          const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
          d.setUTCDate(Math.min(dayOfMonth, lastDay));
        }
        break;
      }
      case 'yearly': {
        d.setUTCFullYear(d.getUTCFullYear() + interval);
        if (dayOfMonth !== null) {
          const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
          d.setUTCDate(Math.min(dayOfMonth, lastDay));
        }
        break;
      }
      default: {
        throw new Error(`Unsupported frequency: ${frequency}`);
      }
    }

    return d.toISOString().split('T')[0];
  }
}
