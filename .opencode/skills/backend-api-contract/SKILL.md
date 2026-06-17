---
name: backend-api-contract
description: Enforces standard ApiResponse format, Swagger documentation via swagger-jsdoc, and REST endpoint conventions for every Express route
metadata:
  agent: backend
---
# backend-api-contract

**Agent:** Backend Agent
**When to activate:** Always. Every endpoint created or modified must comply with this contract.

---

## Standard response format

Every endpoint returns `ApiResponse<T>` from `@mercury/shared`. No exceptions.

```typescript
// packages/shared/src/types/index.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
```

```typescript
// ✅ Successful response
res.json({ success: true, data: expense });

// ✅ Paginated response
res.json({ success: true, data: expenses, meta: { page: 1, limit: 20, total: 150 } });

// ✅ Controlled error (thrown, caught by error middleware)
throw new NotFoundError('Expense not found');

// ❌ Forbidden — unwrapped response
res.json(expense);

// ❌ Forbidden — manual error without proper error class
res.status(500).json({ success: false, error: 'Something went wrong' });
```

## Mandatory Swagger documentation

Every endpoint is documented with JSDoc comments via `swagger-jsdoc`. Minimum annotations:

```typescript
/**
 * @swagger
 * /api/v1/expenses:
 *   get:
 *     summary: Get all expenses for the authenticated user
 *     tags: [Expenses]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of expenses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponseExpenseList'
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, expensesController.findAll);
```

## Versioning

- The API uses the `/api/v1/` prefix configured in the Express app.
- `v2` is never created unless instructed by the Architect Agent.
- New endpoints always go under `v1`.

## Route conventions

| Action       | Method | Route                   |
|-------------|--------|--------------------------|
| List        | GET    | `/api/v1/<resource>`    |
| Get one     | GET    | `/api/v1/<resource>/:id` |
| Create      | POST   | `/api/v1/<resource>`    |
| Update      | PATCH  | `/api/v1/<resource>/:id` |
| Delete      | DELETE | `/api/v1/<resource>/:id` |

- Never use PUT (use PATCH for partial updates).
- Resources always plural and kebab-case (`/income-entries`, not `/incomeEntry`).

## Pagination

Every list endpoint accepts and documents these query params:

- `page` (optional, default 1)
- `limit` (optional, default 20)

The maximum allowed limit is 100. If `limit > 100`, the Service forces it to 100.
