import { Op } from 'sequelize';
import Subscription from '../models/subscription.model';
import RecurringTransaction from '../models/recurring-transaction.model';
import Category from '../models/category.model';
import { NotFoundError, ForbiddenError } from '../middleware/error.middleware';
import type { SubscriptionSummary, ServiceTypeStat } from '@mercury/shared';

const ACTIVE_RECURRING_INCLUDE = {
  model: RecurringTransaction,
  where: { status: 'active', type: 'expense' },
  include: [Category],
};

const DEFAULT_INCLUDE = {
  model: RecurringTransaction,
  include: [Category],
};

export class SubscriptionsService {
  async findAll(userId: string): Promise<Subscription[]> {
    return Subscription.findAll({
      where: { userId },
      include: [DEFAULT_INCLUDE],
    });
  }

  async findById(id: string, userId: string): Promise<Subscription> {
    const subscription = await Subscription.findOne({
      where: { id, userId },
      include: [DEFAULT_INCLUDE],
    });
    if (!subscription) throw new NotFoundError(`Subscription ${id} not found`);
    return subscription;
  }

  async create(
    userId: string,
    data: { recurringTransactionId: string; serviceType: string },
  ): Promise<Subscription> {
    const recurring = await RecurringTransaction.findOne({
      where: { id: data.recurringTransactionId, userId },
    });
    if (!recurring) {
      throw new NotFoundError(
        `Recurring transaction ${data.recurringTransactionId} not found`,
      );
    }

    const existing = await Subscription.findOne({
      where: { recurringTransactionId: data.recurringTransactionId },
      paranoid: false,
    });
    if (existing) {
      throw new ForbiddenError(
        'Subscription already exists for this recurring transaction',
      );
    }

    const subscription = await Subscription.create({
      ...data,
      userId,
    } as any);

    return subscription.reload({ include: [DEFAULT_INCLUDE] });
  }

  async update(
    id: string,
    userId: string,
    data: { serviceType?: string },
  ): Promise<Subscription> {
    const subscription = await this.findById(id, userId);
    if (data.serviceType !== undefined) {
      subscription.serviceType = data.serviceType as Subscription['serviceType'];
      await subscription.save();
    }
    return subscription.reload({ include: [DEFAULT_INCLUDE] });
  }

  async delete(id: string, userId: string): Promise<void> {
    const subscription = await this.findById(id, userId);
    await subscription.destroy();
  }

  async getStats(
    userId: string,
    year?: number,
    month?: number,
  ): Promise<SubscriptionSummary> {
    const subscriptions = await Subscription.findAll({
      where: { userId },
      include: [ACTIVE_RECURRING_INCLUDE],
    });

    const shouldFilter = this.isValidYearMonth(year, month);

    let monthlyTotal = 0;
    let activeCount = 0;
    for (const subscription of subscriptions) {
      if (shouldFilter && !this.overlapsMonth(subscription, year!, month!)) {
        continue;
      }
      monthlyTotal += this.normalizeToMonthly(
        Number(subscription.recurringTransaction.amount),
        subscription.recurringTransaction.frequency,
        subscription.recurringTransaction.interval,
      );
      activeCount += 1;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let nextRenewal: SubscriptionSummary['nextRenewal'] = null;
    let minDays = Infinity;

    for (const subscription of subscriptions) {
      const nextDate = new Date(
        `${subscription.recurringTransaction.nextDate}T00:00:00`,
      );
      const daysUntil = Math.ceil(
        (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysUntil < minDays) {
        minDays = daysUntil;
        nextRenewal = {
          description: subscription.recurringTransaction.description,
          date: subscription.recurringTransaction.nextDate,
          daysUntil,
        };
      }
    }

    return {
      monthlyTotal: Number(monthlyTotal.toFixed(2)),
      yearlyTotal: Number((monthlyTotal * 12).toFixed(2)),
      activeCount,
      nextRenewal,
    };
  }

  async getByServiceType(
    userId: string,
    year?: number,
    month?: number,
  ): Promise<ServiceTypeStat[]> {
    const subscriptions = await Subscription.findAll({
      where: { userId },
      include: [ACTIVE_RECURRING_INCLUDE],
    });

    const shouldFilter = this.isValidYearMonth(year, month);
    const groups = new Map<string, { monthlyTotal: number; count: number }>();

    for (const subscription of subscriptions) {
      if (shouldFilter && !this.overlapsMonth(subscription, year!, month!)) {
        continue;
      }

      const monthly = this.normalizeToMonthly(
        Number(subscription.recurringTransaction.amount),
        subscription.recurringTransaction.frequency,
        subscription.recurringTransaction.interval,
      );

      const current = groups.get(subscription.serviceType) || {
        monthlyTotal: 0,
        count: 0,
      };
      current.monthlyTotal += monthly;
      current.count += 1;
      groups.set(subscription.serviceType, current);
    }

    return Array.from(groups.entries())
      .map(([serviceType, { monthlyTotal, count }]) => ({
        serviceType,
        monthlyTotal: Number(monthlyTotal.toFixed(2)),
        count,
      }))
      .sort((a, b) => b.monthlyTotal - a.monthlyTotal);
  }

  async getUpcomingRenewals(
    userId: string,
    from: string,
    to: string,
  ): Promise<Subscription[]> {
    return Subscription.findAll({
      where: { userId },
      include: [
        {
          model: RecurringTransaction,
          where: { status: 'active', nextDate: { [Op.between]: [from, to] } },
          include: [Category],
        },
      ],
    });
  }

  private isValidYearMonth(year?: number, month?: number): boolean {
    return (
      year !== undefined &&
      month !== undefined &&
      !Number.isNaN(year) &&
      !Number.isNaN(month)
    );
  }

  private getMonthBoundaries(year: number, month: number) {
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayDate = new Date(year, month, 0);
    const lastDay = `${lastDayDate.getFullYear()}-${String(
      lastDayDate.getMonth() + 1,
    ).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
    return { firstDay, lastDay };
  }

  private overlapsMonth(
    subscription: Subscription,
    year: number,
    month: number,
  ): boolean {
    const recurring = subscription.recurringTransaction;
    const { firstDay, lastDay } = this.getMonthBoundaries(year, month);

    const startsBeforeOrInMonth = recurring.startDate <= lastDay;
    const endsAfterOrInMonth =
      !recurring.endDate || recurring.endDate >= firstDay;

    return startsBeforeOrInMonth && endsAfterOrInMonth;
  }

  private normalizeToMonthly(amount: number, frequency: string, interval: number): number {
    const i = interval || 1;
    switch (frequency) {
      case 'monthly':
        return amount / i;
      case 'yearly':
        return amount / i / 12;
      case 'weekly':
        return (amount * 52) / i / 12;
      case 'daily':
        return (amount * 365) / i / 12;
      default:
        return amount / i;
    }
  }
}
