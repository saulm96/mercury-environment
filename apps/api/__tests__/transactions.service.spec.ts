import { TransactionsService } from '../src/services/transactions.service';
import Transaction from '../src/models/transaction.model';
import Category from '../src/models/category.model';
import { NotFoundError } from '../src/middleware/error.middleware';

jest.mock('../src/models/transaction.model');
jest.mock('../src/models/category.model');

const MockedTransaction = Transaction as jest.Mocked<typeof Transaction>;
const MockedCategory = Category as jest.Mocked<typeof Category>;

function mockTransaction(overrides: Partial<Transaction> = {}): Transaction {
  const base = {
    id: 'tx-1',
    userId: 'user-1',
    categoryId: 'cat-1',
    type: 'expense' as const,
    amount: 100,
    description: 'Test transaction',
    date: '2024-01-01',
    category: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as Transaction;

  (base as any).update = jest.fn().mockResolvedValue(undefined);
  (base as any).destroy = jest.fn().mockResolvedValue(undefined);
  (base as any).reload = jest.fn().mockResolvedValue(base);

  return base;
}

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(() => {
    service = new TransactionsService();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns user-scoped transactions with category eager-loaded', async () => {
      const txs = [mockTransaction(), mockTransaction({ id: 'tx-2', description: 'Other' })];
      (MockedTransaction.findAll as jest.Mock).mockResolvedValue(txs);

      const result = await service.findAll('user-1');

      expect(result).toEqual(txs);
      expect(MockedTransaction.findAll).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: [Category],
      });
    });
  });

  describe('findById', () => {
    it('returns the transaction when found', async () => {
      const tx = mockTransaction();
      (MockedTransaction.findOne as jest.Mock).mockResolvedValue(tx);

      const result = await service.findById('tx-1', 'user-1');

      expect(result).toEqual(tx);
      expect(MockedTransaction.findOne).toHaveBeenCalledWith({
        where: { id: 'tx-1', userId: 'user-1' },
        include: [Category],
      });
    });

    it('throws NotFoundError when transaction is not found', async () => {
      (MockedTransaction.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('tx-1', 'user-1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('creates a transaction with the provided user ID', async () => {
      const tx = mockTransaction();
      (MockedTransaction.create as jest.Mock).mockResolvedValue(tx);

      const data = { type: 'expense', amount: 100, description: 'Test', date: '2024-01-01' };
      const result = await service.create('user-1', data as Partial<Transaction>);

      expect(MockedTransaction.create).toHaveBeenCalledWith({ ...data, userId: 'user-1' });
      expect(tx.reload).toHaveBeenCalledWith({ include: [Category] });
      expect(result).toEqual(tx);
    });
  });

  describe('update', () => {
    it('patches allowed fields and returns the updated transaction', async () => {
      const tx = mockTransaction();
      (MockedTransaction.findOne as jest.Mock).mockResolvedValue(tx);

      const data = { description: 'Updated description', amount: 200 };
      const result = await service.update('tx-1', 'user-1', data as Partial<Transaction>);

      expect(tx.update).toHaveBeenCalledWith(data);
      expect(tx.reload).toHaveBeenCalledWith({ include: [Category] });
      expect(result).toEqual(tx);
    });

    it('throws NotFoundError for a non-existent ID', async () => {
      (MockedTransaction.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.update('tx-1', 'user-1', {} as Partial<Transaction>)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('verifies ownership using authenticated userId, not the data payload', async () => {
      const tx = mockTransaction({ userId: 'user-1' });
      (MockedTransaction.findOne as jest.Mock).mockResolvedValue(tx);

      await service.update('tx-1', 'user-1', { userId: 'hacker-id' } as Partial<Transaction>);

      expect(MockedTransaction.findOne).toHaveBeenCalledWith({
        where: { id: 'tx-1', userId: 'user-1' },
        include: [Category],
      });
    });
  });

  describe('delete', () => {
    it('soft-deletes the transaction and returns void', async () => {
      const tx = mockTransaction();
      (MockedTransaction.findOne as jest.Mock).mockResolvedValue(tx);

      const result = await service.delete('tx-1', 'user-1');

      expect(tx.destroy).toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('throws NotFoundError for a non-existent ID', async () => {
      (MockedTransaction.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('tx-1', 'user-1')).rejects.toThrow(NotFoundError);
    });
  });
});
