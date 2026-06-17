---
name: backend-test
description: Enforces backend test coverage — unit tests for services and routes with supertest, jest mocks, minimum 80% coverage thresholds
metadata:
  agent: backend
---
# backend-test

**Agent:** Backend Agent
**When to activate:** When creating or modifying any Service or Route.

---

## Absolute rule

**No module is delivered without tests.** The QA Agent will reject any PR without minimum Service coverage.

## Service tests (unit)

Mock the Sequelize model with `jest.fn()`. Never use the real database in unit tests.

```typescript
// __tests__/expenses.service.spec.ts
import { ExpensesService } from '../expense.service';
import { Expense } from '../expense.model';
import { NotFoundError } from '../../middleware/error.middleware';

jest.mock('../expense.model');

describe('ExpensesService', () => {
  let service: ExpensesService;

  beforeEach(() => {
    service = new ExpensesService();
    jest.clearAllMocks();
  });

  it('findAll returns expenses for the user', async () => {
    const mockExpenses = [{ id: '1', amount: 50, toJSON: () => ({ id: '1', amount: 50 }) }];
    (Expense.findAll as jest.Mock).mockResolvedValue(mockExpenses);

    const result = await service.findAll('user-id');
    expect(Expense.findAll).toHaveBeenCalledWith({ where: { userId: 'user-id' } });
    expect(result).toHaveLength(1);
  });

  it('findOne throws NotFoundError when not found', async () => {
    (Expense.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne('bad-id', 'user-id')).rejects.toThrow(NotFoundError);
  });

  it('create returns the created expense', async () => {
    const data = { amount: 50, description: 'Coffee', date: '2024-01-15' };
    const mockRecord = { id: '1', ...data, userId: 'user-id', toJSON: () => ({ id: '1', ...data, userId: 'user-id' }) };
    (Expense.create as jest.Mock).mockResolvedValue(mockRecord);

    const result = await service.create('user-id', data);
    expect(result).toEqual({ id: '1', ...data, userId: 'user-id' });
  });
});
```

## Route tests (integration with supertest)

Test that the router delegates correctly: middleware is applied, service is called, responses are formatted.

```typescript
// __tests__/expenses.routes.spec.ts
import request from 'supertest';
import express from 'express';
import { expensesRouter } from '../expense.routes';
import { ExpensesService } from '../expense.service';

jest.mock('../expense.service');

// Mock auth middleware
jest.mock('../../middleware/auth.middleware', () => ({
  authenticate: (req: Request, res: Response, next: NextFunction) => {
    (req as any).user = { id: 'user-123', email: 'test@test.com' };
    next();
  },
}));

describe('Expenses Routes', () => {
  let app: express.Express;
  let mockService: jest.Mocked<ExpensesService>;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/v1/expenses', expensesRouter);
    mockService = (ExpensesService as jest.Mock).mock.instances[0] as any;
  });

  it('GET /api/v1/expenses returns expenses for authenticated user', async () => {
    mockService.findAll = jest.fn().mockResolvedValue([{ id: '1', amount: 50 }]);

    const res = await request(app).get('/api/v1/expenses');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [{ id: '1', amount: 50 }] });
    expect(mockService.findAll).toHaveBeenCalledWith('user-123');
  });

  it('POST /api/v1/expenses returns 201 on success', async () => {
    const newExpense = { amount: 50, description: 'Coffee', date: '2024-01-15' };
    mockService.create = jest.fn().mockResolvedValue({ id: '1', ...newExpense, userId: 'user-123' });

    const res = await request(app).post('/api/v1/expenses').send(newExpense);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
```

## Mandatory coverage targets

- ✅ All public Service methods.
- ✅ The happy path of every route endpoint.
- ✅ The resource-not-found case (`NotFoundError` / 404).
- ✅ The unauthorized access case (`ForbiddenError` / 403) if applicable.
- ✅ Validation failure case (400 on invalid body).
- ❌ Zod schemas and middleware do not need dedicated tests.

## Minimum coverage required by the QA Agent

- Statements: 80%
- Branches: 75%
- Functions: 80%

The QA Agent will reject if `jest --coverage` reports lower values.
