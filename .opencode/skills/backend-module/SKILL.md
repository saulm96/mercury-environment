---
name: backend-module
description: Defines Express route/service/schema structure — Router, Service, Zod validation, and test conventions with strict separation of concerns
metadata:
  agent: backend
---
# backend-module

**Agent:** Backend Agent
**When to activate:** Whenever a new Express resource (routes + service) is created.

---

## Mandatory structure

Every resource follows exactly this structure. No layer may be omitted:

```
apps/api/src/<name>/
  <name>.routes.ts       ← Express Router, applies middleware, delegates to service
  <name>.service.ts      ← all business logic, accesses the Sequelize model
  schemas/
    <name>.schema.ts     ← Zod schemas for create and update request bodies
  __tests__/
    <name>.service.spec.ts
    <name>.routes.spec.ts
```

## Routes rules

- The router only applies middleware and delegates to the service. Never contains business logic.
- All protected routes apply the `authenticate` middleware.
- Request bodies are validated with the Zod `validate` middleware before reaching the route handler.
- The authenticated user is extracted from `req.user`, never from `req.params` or `req.query`.
- Always returns `ApiResponse<T>` from `@mercury/shared`.

```typescript
// ✅ Correct
import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { createExpenseSchema, updateExpenseSchema } from './schemas/expense.schema';
import { ExpensesService } from './expense.service';

const router = Router();
const service = new ExpensesService();

router.get('/', authenticate, async (req: Request, res: Response) => {
  const user = req.user as User;
  const expenses = await service.findAll(user.id);
  res.json({ success: true, data: expenses });
});

router.post('/', authenticate, validate(createExpenseSchema), async (req: Request, res: Response) => {
  const user = req.user as User;
  const expense = await service.create(user.id, req.body);
  res.status(201).json({ success: true, data: expense });
});

// ❌ Forbidden — logic in the route handler
router.get('/', authenticate, async (req: Request, res: Response) => {
  const user = req.user as User;
  const expenses = await ExpenseModel.findAll({ where: { userId: user.id } });
  res.json({ success: true, data: expenses.filter(e => e.amount > 0) }); // logic here = error
});
```

## Service rules

- Is the single point of access to the Sequelize model.
- Every operation that modifies more than one table uses a transaction.
- Business errors throw custom error classes (`NotFoundError`, `ForbiddenError`), which are caught by the global error middleware.
- Never returns the model instance directly. Always returns the plain type from `@mercury/shared`.

```typescript
// ✅ Correct
import { Expense } from './expense.model';

export class ExpensesService {
  async findOne(id: string, userId: string): Promise<Expense> {
    const record = await Expense.findOne({ where: { id, userId } });
    if (!record) throw new NotFoundError(`Expense ${id} not found`);
    return record.toJSON() as Expense;
  }

  async create(userId: string, data: CreateExpenseDto): Promise<Expense> {
    const record = await Expense.create({ ...data, userId });
    return record.toJSON() as Expense;
  }
}
```

## Zod schema rules

- Every create and update operation has a corresponding Zod schema.
- All fields have explicit types and constraints (`min`, `max`, `positive`, `regex`).
- Optional fields in update schemas use `.optional()`.

```typescript
// schemas/expense.schema.ts
import { z } from 'zod';

export const createExpenseSchema = z.object({
  body: z.object({
    amount: z.number().positive().max(99999999.99),
    description: z.string().min(1).max(255),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  }),
});

export const updateExpenseSchema = z.object({
  body: z.object({
    amount: z.number().positive().max(99999999.99).optional(),
    description: z.string().min(1).max(255).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  }),
});
```

## Validation middleware

The `validate` middleware parses the request body against a Zod schema and returns a 400 error with details on failure.

```typescript
// middleware/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({ body: req.body, query: req.query, params: req.params });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: err.errors,
        });
        return;
      }
      next(err);
    }
  };
}
```

## Error middleware

A global error handler converts known error classes to proper HTTP responses.

```typescript
// middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';

export class NotFoundError extends Error {
  constructor(message: string) { super(message); this.name = 'NotFoundError'; }
}

export class ForbiddenError extends Error {
  constructor(message: string) { super(message); this.name = 'ForbiddenError'; }
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof NotFoundError) {
    res.status(404).json({ success: false, error: err.message });
    return;
  }
  if (err instanceof ForbiddenError) {
    res.status(403).json({ success: false, error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ success: false, error: 'Internal server error' });
}
```

## Prohibitions

- ❌ Business logic in route handlers.
- ❌ Direct model access from route handlers.
- ❌ Raw request body without Zod validation on POST/PATCH routes.
- ❌ Returning model instances directly (always `.toJSON()`).
