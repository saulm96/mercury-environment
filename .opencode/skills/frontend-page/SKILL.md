---
name: frontend-page
description: React page conventions — Function Components with Suspense and ErrorBoundary, React Router paths, kebab-case routes
metadata:
  agent: frontend
---
# frontend-page

**Agent:** Frontend Agent
**When to activate:** Whenever a new page is created in the frontend.

---

## Mandatory structure per page

Before creating any page, read `design-system/mercury/MASTER.md` and check if `design-system/mercury/pages/<page>.md` exists. Apply color tokens, typography, spacing, and effects defined there.

Every page consists of:

```
src/pages/<tool>/
  <Name>Page.tsx      ← page component (Function Component)
  <Name>Skeleton.tsx  ← skeleton for Suspense fallback
  <Name>Error.tsx     ← error UI for ErrorBoundary fallback
  <Name>Layout.tsx    ← optional custom layout for this page
```

Also register the route in `src/routes.tsx` (centralized React Router config).

## `<Name>Page.tsx` rules

- Is a **Function Component**. No Server Components exist in Vite.
- Contains no business logic. Only composes container components.
- Wraps data-fetching containers in `<Suspense>` with the skeleton as fallback.
- Wraps the content in an `<ErrorBoundary>` (from `react-error-boundary`) with the error UI as fallback.

```typescript
// ✅ Correct — composes containers with Suspense + ErrorBoundary
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ExpensesList } from './containers/ExpensesList';
import { ExpensesSkeleton } from './ExpensesSkeleton';
import { ExpensesError } from './ExpensesError';

export default function ExpensesPage() {
  return (
    <main>
      <PageHeader title="Expenses" />
      <ErrorBoundary fallback={<ExpensesError />}>
        <Suspense fallback={<ExpensesSkeleton />}>
          <ExpensesList />
        </Suspense>
      </ErrorBoundary>
    </main>
  );
}
```

```typescript
// ❌ Forbidden — logic in the page
export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  useEffect(() => { fetch('/api/v1/expenses').then(...) }, []);
  return <div>{expenses.map(...)}</div>;
}
```

## `<Name>Skeleton.tsx` rules

Returns a skeleton that replicates the shape of the real data. Do not use generic spinners.

```typescript
// ✅ Correct
export function ExpensesSkeleton() {
  return (
    <div>
      <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-4" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 animate-pulse rounded mb-2" />
      ))}
    </div>
  );
}
```

## `<Name>Error.tsx` rules

Shows the error and offers a retry. Uses `FallbackProps` from `react-error-boundary`.

```typescript
import type { FallbackProps } from 'react-error-boundary';

export function ExpensesError({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="text-center py-12">
      <p className="text-red-600 mb-4">Something went wrong loading your expenses.</p>
      <button onClick={resetErrorBoundary} className="btn-primary">
        Try again
      </button>
    </div>
  );
}
```

## `<Name>Layout.tsx` rules (optional)

Only create if the page needs a specific layout different from the global layout. Receives `children` as props and wraps them with shared UI elements (sidebar, tool-specific header, etc.).

## Route registration

Every new page is registered in `src/routes.tsx`:

```typescript
// src/routes.tsx
import { createBrowserRouter } from 'react-router-dom';
import { ExpensesPage } from './pages/expenses/ExpensesPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'expenses', element: <ExpensesPage /> },
    ],
  },
]);
```

## Route naming

- Route paths use kebab-case: `/income-entries`, not `/incomeEntries`.
- React Router paths are string-based, not file-system based.
- Tool pages live under a shared layout route with simple path segments.
- Auth routes (e.g., `/login`) use their own layout if they differ from the main layout.
