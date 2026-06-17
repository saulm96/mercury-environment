---
name: qa-contract-check
description: Verifies API contracts between backend and frontend — checks shared types, endpoint documentation, and Zod schema consistency before frontend work begins
metadata:
  agent: qa
---
# qa-contract-check

**Agent:** QA Agent
**When to activate:** When the Backend Agent finishes its part and before the Frontend Agent starts.

---

## Purpose

Verify that the API contract is well-defined in `packages/shared` before the frontend consumes it. Detecting problems at this point is much cheaper than detecting them after the frontend is written.

## Checklist

### Types in `packages/shared`

- [ ] An interface exists for each new entity.
- [ ] Interfaces match the Sequelize model field-by-field (names, types, optionality).
- [ ] `createdAt`, `updatedAt`, `deletedAt` fields are present if the model is `paranoid: true`.
- [ ] Date types are `string` (ISO 8601), not `Date` — JSON does not serialize `Date`.
- [ ] No duplicate types between `packages/shared` and `apps/api` or `apps/web`.

### Documented endpoints

- [ ] All new endpoints are documented in Swagger (`GET http://localhost:3001/api-docs`).
- [ ] Body fields match the Zod schemas in `apps/api/src/<name>/schemas/`.
- [ ] Response fields match the types from `packages/shared`.

### Quick type check

```typescript
// Verify that the shared type matches what the endpoint returns
// This is a mental/manual check, not an automated test:

// In packages/shared:
interface Expense {
  id: string;        // UUID stored as CHAR(36)
  userId: string;    // UUID stored as CHAR(36)
  amount: number;    // DECIMAL → number in JSON
  description: string;
  date: string;      // DATEONLY → 'YYYY-MM-DD'
  createdAt: string; // DATE → ISO string
  updatedAt: string;
}

// In the Sequelize model of apps/api:
// id: DataType.CHAR(36) ✅
// userId: DataType.CHAR(36) ✅
// amount: DataType.DECIMAL(10, 2) → number in JSON ✅
// description: DataType.STRING ✅
// date: DataType.DATEONLY → string ✅
// timestamps: true → createdAt, updatedAt ✅
```

## Contract check output

```
## Contract Check — <tool name>

### Verified types
- ✅ Expense: all fields match
- ✅ CreateExpenseDto: fields validated

### Verified endpoints
- ✅ GET /api/v1/expenses → ApiResponse<Expense[]>
- ✅ POST /api/v1/expenses → ApiResponse<Expense>
- ✅ PATCH /api/v1/expenses/:id → ApiResponse<Expense>
- ✅ DELETE /api/v1/expenses/:id → ApiResponse<void>

### Verdict
READY FOR FRONTEND / BLOCKED
```

Only when the verdict is "READY FOR FRONTEND" is the Frontend Agent activated.
