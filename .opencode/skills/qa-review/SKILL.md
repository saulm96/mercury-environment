---
name: qa-review
description: Final review checklist — runs test coverage, TypeScript checks, architecture compliance, and production builds; blocks on failure
metadata:
  agent: qa
---
# qa-review

**Agent:** QA Agent
**When to activate:** Upon completion of any full feature (backend + frontend).

---

## Mandatory review checklist

The QA Agent executes this checklist in order. If any point fails, **stop and report** before continuing.

### 1. Tests

```bash
# Backend
cd apps/api && npx jest --coverage --passWithNoTests
# Minimum coverage: Statements 80%, Branches 75%, Functions 80%

# Frontend
cd apps/web && npx jest --coverage --passWithNoTests
# Minimum coverage: Statements 70%, Branches 65%, Functions 70%
```

If coverage is not met → **STOP. Report what is missing and why.**

### 2. TypeScript with no errors

```bash
# From the root
npx tsc --noEmit -p apps/api/tsconfig.json
npx tsc --noEmit -p apps/web/tsconfig.json
npx tsc --noEmit -p packages/shared/tsconfig.json
```

Any TypeScript error → **STOP. `any` and `@ts-ignore` are not accepted without documented justification.**

### 3. API ↔ Frontend contract

Manually verify that:
- The types used in the frontend (`@mercury/shared`) exactly match what the API returns.
- The frontend endpoints point to routes that exist in the backend.
- All backend endpoints are being used (no orphan endpoints).

### 4. Backend architecture rules

Verify that the new module complies with:
- [ ] `routes.ts` and `service.ts` files exist.
- [ ] `schemas/` folder exists with Zod validation schemas.
- [ ] The route handler contains no business logic.
- [ ] The service does not return model instances directly (uses `.toJSON()`).
- [ ] All protected routes have the `authenticate` middleware applied.
- [ ] All responses use `ApiResponse<T>`.

### 5. Frontend architecture rules

Verify that the new code complies with:
- [ ] No direct `fetch()` in components or hooks outside of `src/lib/api.ts`.
- [ ] Components do not hold server state locally (no `useState` for API data).
- [ ] Hooks return objects with `isLoading` and `error`.
- [ ] Domain types come from `@mercury/shared`, not redefined locally.
- [ ] Suspense boundaries and Error Boundaries are implemented for each new page.

### 6. Production build

```bash
cd apps/api && npm run build   # must complete without errors
cd apps/web && npm run build   # must complete without errors
```

## QA Agent report format

```
## QA Review — <feature name>

### ✅ Passed
- Backend tests: X% statements, X% branches
- TypeScript: no errors
- ...

### ❌ Blockers
- [BACKEND] The expenses service returns `expense` (Sequelize instance) instead of `expense.toJSON()`
- [FRONTEND] The ExpenseForm component fetches directly without using api.ts

### ⚠️ Warnings (non-blocking)
- ...

### Verdict
APPROVED / REJECTED
```

If the verdict is REJECTED, the QA Agent does not touch the code. It returns the report to the corresponding agent for correction.
