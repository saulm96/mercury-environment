---
name: frontend-page
description: Next.js page conventions — Server Components by default, mandatory loading.tsx and error.tsx, kebab-case routes
metadata:
  agent: frontend
---
# frontend-page

**Agent:** Frontend Agent
**When to activate:** Whenever a new route is created in Next.js.

---

## Mandatory structure per route

Before creating any page, read `design-system/mercury/MASTER.md` and check if `design-system/mercury/pages/<page>.md` exists. Apply color tokens, typography, spacing, and effects defined there.

Every route has these files. None may be omitted:

```
src/app/(tools)/<tool>/
  page.tsx        ← page component (Server Component by default)
  loading.tsx     ← skeleton or spinner while loading
  error.tsx       ← error UI with retry button
  layout.tsx      ← only if it needs its own layout, otherwise omit
```

## `page.tsx` rules

- Is a **Server Component** by default. Only converted to a Client Component (`'use client'`) if it needs direct interactivity (rare).
- Contains no business logic. Only composes components and passes data as props.
- If it needs server data, uses `async/await` directly (Server Component).
- If it needs client data, delegates to a child component with the corresponding hook.

```typescript
// ✅ Correct — Server Component that composes
export default async function ExpensesPage() {
  return (
    <main>
      <PageHeader title="Expenses" />
      <ExpensesList />   {/* this component has its own hook */}
    </main>
  );
}

// ❌ Forbidden — logic in the page
export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  useEffect(() => { fetch('/api/v1/expenses').then(...) }, []);
  return <div>{expenses.map(...)}</div>;
}
```

## `loading.tsx` rules

Returns a skeleton that replicates the shape of the real page. Do not use generic spinners.

```typescript
// ✅ Correct
export default function ExpensesLoading() {
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

## `error.tsx` rules

Always a Client Component (Next.js requirement). Shows the error and offers a retry.

```typescript
'use client';
export default function ExpensesError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <p>Something went wrong loading your expenses.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

## Route naming

- Tool routes under the `(tools)` group: `src/app/(tools)/expenses/`.
- Auth routes under the `(auth)` group: `src/app/(auth)/login/`.
- Never mix groups.
- Route segments in kebab-case: `income-entries`, not `incomeEntries`.
