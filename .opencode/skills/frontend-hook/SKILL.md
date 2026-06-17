---
name: frontend-hook
description: React hook conventions — all frontend business logic lives in hooks, components remain dumb, standardized return shapes
metadata:
  agent: frontend
---
# frontend-hook

**Agent:** Frontend Agent
**When to activate:** Whenever state, data fetching, or business logic is needed on the frontend.

---

## Golden rule

**All frontend business logic lives in hooks. Components are dumb.**

## Location and naming

```
src/hooks/<tool>/
  use<Name>List.ts       → list with pagination
  use<Name>Detail.ts     → single item detail
  use<Name>Create.ts     → create mutation
  use<Name>Update.ts     → update mutation
  use<Name>Delete.ts     → delete mutation
```

Real examples: `useExpensesList`, `useExpenseCreate`, `useIncomeDetail`.

## List hook structure

```typescript
// src/hooks/expenses/useExpensesList.ts
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Expense, ApiResponse } from '@mercury/shared';

interface UseExpensesListReturn {
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;
  page: number;
  total: number;
  nextPage: () => void;
  prevPage: () => void;
  refetch: () => void;
}

export function useExpensesList(limit = 20): UseExpensesListReturn {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<ApiResponse<Expense[]>>(`/expenses?page=${page}&limit=${limit}`);
      setExpenses(response.data ?? []);
      setTotal(response.meta?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  return {
    expenses,
    isLoading,
    error,
    page,
    total,
    nextPage: () => setPage(p => p + 1),
    prevPage: () => setPage(p => Math.max(1, p - 1)),
    refetch: fetchExpenses,
  };
}
```

## Mutation hook structure

```typescript
// src/hooks/expenses/useExpenseCreate.ts
interface UseExpenseCreateReturn {
  create: (data: CreateExpenseDto) => Promise<void>;
  isCreating: boolean;
  error: string | null;
}

export function useExpenseCreate(onSuccess?: () => void): UseExpenseCreateReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (data: CreateExpenseDto) => {
    setIsCreating(true);
    setError(null);
    try {
      await api.post('/expenses', data);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsCreating(false);
    }
  };

  return { create, isCreating, error };
}
```

## Rules

- Hooks always return a named object, never an array (eases extension).
- The loading state is called `isLoading` or `is<Action>ing` (`isCreating`, `isDeleting`).
- The error state is called `error` and is `string | null`.
- Mutation hooks accept an optional `onSuccess` callback so the component can react.
- **Never** use `any` in return types.
- Data types always come from `@mercury/shared`.

## Prohibitions

- ❌ Presentation logic in a hook (CSS classes, UI text).
- ❌ Direct access to `document` or `window` except in effects with an environment check.
- ❌ More than one responsibility per hook. If the hook does too much, split it.
