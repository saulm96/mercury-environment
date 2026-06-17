---
name: frontend-component
description: React component rules — dumb components that receive data via props and emit events via callbacks, never fetch or hold business logic
metadata:
  agent: frontend
---
# frontend-component

**Agent:** Frontend Agent
**When to activate:** Whenever a React component is created.

---

## Golden rule

**A component receives data via props and communicates events via callbacks. It never fetches, never accesses the API, never holds business logic.**

## Component classification

### UI components (`src/components/ui/`)
Completely domain-agnostic. Could exist in any project.

```typescript
// ✅ Correct — knows nothing about "expenses"
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}
export function Button({ label, onClick, variant = 'primary', disabled }: ButtonProps) { ... }
```

### Domain components (`src/components/<tool>/`)
Know about domain types but do not fetch. Receive data and emit events.

```typescript
// ✅ Correct
interface ExpenseCardProps {
  expense: Expense;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}
export function ExpenseCard({ expense, onDelete, onEdit }: ExpenseCardProps) { ... }

// ❌ Forbidden — the component fetches
export function ExpenseCard({ expenseId }: { expenseId: string }) {
  const [expense, setExpense] = useState(null);
  useEffect(() => { fetch(`/api/v1/expenses/${expenseId}`).then(...) }, []);
  // ...
}
```

### Container components (`src/components/<tool>/`)
Combine a domain hook with presentation components. They are the only type that uses hooks.

```typescript
// ✅ Correct — the container connects hook + components
export function ExpensesList() {
  const { expenses, isLoading, deleteExpense } = useExpensesList();

  if (isLoading) return <ExpensesListSkeleton />;
  return (
    <ul>
      {expenses.map(expense => (
        <ExpenseCard key={expense.id} expense={expense} onDelete={deleteExpense} />
      ))}
    </ul>
  );
}
```

## Typing rules

- All props are typed with `interface`, never with inline `type` or `any`.
- Domain types always come from `@mercury/shared`, never redefined locally.
- Optional props have a default value declared in the destructuring.

## Naming rules

- Components: `PascalCase` — `ExpenseCard`, `IncomeList`.
- Files: `kebab-case` — `expense-card.tsx`, `income-list.tsx`.
- One component per file. No exceptions.

## Explicit prohibitions

- ❌ `fetch()` or `axios` inside a component.
- ❌ `localStorage` or `sessionStorage`.
- ❌ Data transformation logic (that belongs in the hook or `src/lib/`).
- ❌ `console.log` in components going to production.
- ❌ Inline styles (`style={{ color: 'red' }}`). Always Tailwind.
- ❌ Hardcoded color values — use CSS variables (`--color-primary`, `--color-cta`, `--space-md`, etc.) from `design-system/mercury/MASTER.md`.
