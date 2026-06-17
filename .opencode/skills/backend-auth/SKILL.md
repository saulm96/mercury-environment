---
name: backend-auth
description: Enforces authentication rules — JWT middleware usage, ownership verification in services, and public route documentation
metadata:
  agent: backend
---
# backend-auth

**Agent:** Backend Agent
**When to activate:** When protecting routes, accessing the authenticated user, or touching anything related to authentication.

---

## Absolute rule

**The Backend Agent never reimplements authentication.** The auth middleware already exists. Use it, do not touch it unless explicitly instructed by the Architect Agent.

## Protecting a route

Apply the `authenticate` middleware to the route. The authenticated user is available as `req.user`.

```typescript
import { authenticate } from '../middleware/auth.middleware';

// ✅ Correct
router.get('/', authenticate, async (req: Request, res: Response) => {
  const user = req.user as User;
  // ...
});

// ❌ Forbidden — never extract the user from the token manually
router.get('/', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  // ...
});

// ❌ Forbidden — never receive userId via query param or body
router.get('/', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  // ...
});
```

## Resource-level authorization

The Service is responsible for verifying that the resource belongs to the user. The Route handler does not perform this check.

```typescript
// ✅ Correct — the service verifies ownership
async findOne(id: string, userId: string): Promise<Expense> {
  const record = await this.expenseModel.findOne({ where: { id, userId } });
  if (!record) throw new NotFoundError(`Expense ${id} not found`);
  return record.toJSON() as Expense;
}

// ❌ Forbidden — the route handler never verifies ownership
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const user = req.user as User;
  const expense = await Expense.findByPk(req.params.id);
  if (expense.userId !== user.id) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  // ownership check belongs in the service
});
```

## Public routes

If a route does not require authentication, it is documented explicitly with a `// PUBLIC ROUTE` comment and justified. Do not apply the `authenticate` middleware.

```typescript
// PUBLIC ROUTE — health check does not require auth
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});
```

## What the Backend Agent never does with auth

- Does not modify JWT configuration or Google OAuth strategy.
- Does not change cookie configuration.
- Does not add new OAuth providers without instruction from the Architect Agent.
- Does not create its own session or token system.
