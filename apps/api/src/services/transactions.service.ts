import Transaction from '../models/transaction.model';
import { NotFoundError } from '../middleware/error.middleware';

export class TransactionsService {
  async findAll(userId: string): Promise<Transaction[]> {
    return Transaction.findAll({ where: { userId } });
  }

  async findById(id: string, userId: string): Promise<Transaction> {
    const transaction = await Transaction.findOne({ where: { id, userId } });
    if (!transaction) throw new NotFoundError(`Transaction ${id} not found`);
    return transaction;
  }

  async create(userId: string, data: Partial<Transaction>): Promise<Transaction> {
    return Transaction.create({ ...data, userId });
  }

  async update(id: string, userId: string, data: Partial<Transaction>): Promise<Transaction> {
    const transaction = await this.findById(id, userId);
    await transaction.update(data);
    return transaction;
  }

  async delete(id: string, userId: string): Promise<void> {
    const transaction = await this.findById(id, userId);
    await transaction.destroy();
  }
}
