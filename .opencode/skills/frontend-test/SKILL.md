---
name: frontend-test
description: Enforces frontend test coverage — React Testing Library for components, renderHook for hooks, minimum 70% coverage thresholds
metadata:
  agent: frontend
---
# frontend-test

**Agent:** Frontend Agent
**When to activate:** When creating or modifying any component or hook.

---

## Absolute rule

**No container component or hook is delivered without tests.**

## Component tests (React Testing Library)

Test behavior, not implementation. Never access internal state or props directly.

```typescript
// src/components/expenses/__tests__/expense-card.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpenseCard } from '../expense-card';
import type { Expense } from '@mercury/shared';

const mockExpense: Expense = {
  id: '1',
  amount: 50.00,
  description: 'Coffee',
  date: '2024-01-15',
  userId: 'user-1',
};

describe('ExpenseCard', () => {
  it('renders the expense description and amount', () => {
    render(<ExpenseCard expense={mockExpense} onDelete={jest.fn()} onEdit={jest.fn()} />);
    expect(screen.getByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it('calls onDelete with the expense id when delete button is clicked', () => {
    const onDelete = jest.fn();
    render(<ExpenseCard expense={mockExpense} onDelete={onDelete} onEdit={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith('1');
  });
});
```

## Hook tests (renderHook)

Mock the `@/lib/api` module entirely. Never make real HTTP requests in tests.

```typescript
// src/hooks/expenses/__tests__/useExpensesList.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useExpensesList } from '../useExpensesList';
import { api } from '@/lib/api';

jest.mock('@/lib/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('useExpensesList', () => {
  it('fetches and returns expenses', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: [{ id: '1', amount: 50 }], meta: { total: 1 } });

    const { result } = renderHook(() => useExpensesList());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.expenses).toHaveLength(1);
  });

  it('sets error state when the API fails', async () => {
    mockedApi.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useExpensesList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Network error');
  });
});
```

## Mandatory coverage targets

- ✅ All container components.
- ✅ All hooks (happy path + error path).
- ❌ Pure UI components (Button, Input) do not need tests unless they have complex internal logic.
- ❌ Pages (`page.tsx`) are not unit-tested — that is covered by the QA Agent with integration tests.

## Preferred selectors (in priority order)

1. `getByRole` — whenever possible.
2. `getByLabelText` — for form inputs.
3. `getByText` — for visible content.
4. `getByTestId` — last resort, only if no semantic alternative exists.
