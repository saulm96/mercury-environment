# mercury-environment

## Transaction Services

### Overview

Mercury uses a **two-tier** transaction model:

- **Normal transactions** (`Transaction`) are financial records — income or expense events on a specific date. They have a category, an amount, and a description.
- **Recurring transactions** (`RecurringTransaction`) are templates that automatically generate normal transactions on a schedule (daily, weekly, monthly, or yearly).

Generated transactions are first-class `Transaction` rows — they appear in the list, count toward budgets, and are individually editable, no different from manually created ones.

---

### Data Models

#### Transaction (`transactions` table)

| Column | Type | Notes |
|--------|------|-------|
| `id` | CHAR(36) PK | UUID v4 |
| `userId` | CHAR(36) FK | Indexed, NOT NULL |
| `categoryId` | CHAR(36) FK | Nullable, indexed |
| `type` | ENUM(`income`, `expense`) | |
| `amount` | DECIMAL(10,2) | |
| `description` | VARCHAR(255) | |
| `date` | DATEONLY | `YYYY-MM-DD`, indexed |
| `recurringTransactionId` | CHAR(36) FK | Nullable — set for generated occurrences |
| `createdAt` / `updatedAt` / `deletedAt` | TIMESTAMP | Paranoid soft-delete |

**Unique composite index**: `(recurringTransactionId, date)` — ensures the same recurring occurrence is never generated twice. Since `recurringTransactionId` is nullable, manual transactions (`recurringTransactionId = NULL`) are unaffected (MySQL treats multiple NULLs as distinct in unique indexes).

#### RecurringTransaction (`recurring_transactions` table)

| Column | Type | Notes |
|--------|------|-------|
| `id` | CHAR(36) PK | UUID v4 |
| `userId` | CHAR(36) FK | Indexed, NOT NULL |
| `categoryId` | CHAR(36) FK | Nullable, indexed |
| `type` | ENUM(`income`, `expense`) | |
| `amount` | DECIMAL(10,2) | |
| `description` | VARCHAR(255) | |
| `frequency` | ENUM(`daily`, `weekly`, `monthly`, `yearly`) | |
| `interval` | INTEGER | Every N units, default 1 |
| `startDate` | DATEONLY | First occurrence date |
| `endDate` | DATEONLY | Nullable — null = indefinite |
| `nextDate` | DATEONLY | Next date to generate, **indexed** |
| `dayOfMonth` | INTEGER | Nullable — anchor for monthly/yearly |
| `dayOfWeek` | INTEGER | Nullable — anchor for weekly |
| `status` | ENUM(`active`, `paused`, `cancelled`) | Default `active` |
| `createdAt` / `updatedAt` / `deletedAt` | TIMESTAMP | Paranoid soft-delete |

**Relationships**: `BelongsTo(User)`, `BelongsTo(Category)`, `HasMany(Transaction)`, `HasMany(RecurringSkip)`.

#### RecurringSkip (`recurring_skips` table)

| Column | Type | Notes |
|--------|------|-------|
| `id` | CHAR(36) PK | UUID v4 |
| `recurringTransactionId` | CHAR(36) FK | Indexed, NOT NULL |
| `occurrenceDate` | DATEONLY | Date to skip |

**Unique composite index**: `(recurringTransactionId, occurrenceDate)` — a date cannot be skipped twice. Paranoid soft-delete.

---

### API Reference

All endpoints are prefixed with `/api/v1`, require authentication via JWT cookie, and return the standard envelope:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "message" }
```

#### Normal Transactions (`/api/v1/transactions`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all transactions for the authenticated user (includes category) |
| `GET` | `/:id` | Get a single transaction by ID (ownership-scoped) |
| `POST` | `/` | Create a transaction. Body: `{ type, amount, description, date, categoryId? }` |
| `PATCH` | `/:id` | Update fields. All fields are optional |
| `DELETE` | `/:id` | Soft-delete the transaction |

Zod validation: `type` must be `income` or `expense`, `amount` positive ≤ 99,999,999.99, `description` 1–255 chars, `date` format `YYYY-MM-DD`, `categoryId` must be a valid UUID if provided.

#### Recurring Transactions (`/api/v1/recurring-transactions`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all recurring rules for the user (includes category) |
| `POST` | `/` | Create a recurring rule. Body: `{ type, amount, description, date, frequency, interval?, endDate?, dayOfMonth?, dayOfWeek?, categoryId? }` |
| `POST` | `/process-due` | Generate all due occurrences up to today. Returns `{ generated, errors }` |
| `GET` | `/:id` | Get a single recurring rule by ID (ownership-scoped) |
| `PATCH` | `/:id` | Update the template. Only affects future occurrences |
| `DELETE` | `/:id` | Soft-delete the rule. Generated transactions remain as history |
| `POST` | `/:id/skip` | Skip a specific occurrence date. Body: `{ occurrenceDate }` |
| `DELETE` | `/:id/skip` | Un-skip a previously skipped date. Query: `?occurrenceDate=YYYY-MM-DD` |

Zod validation: `frequency` must be `daily`, `weekly`, `monthly`, or `yearly`; `interval` integer ≥ 1 (defaults to 1); `dayOfMonth` 1–31; `dayOfWeek` 1–7; `endDate` optional.

---

### Recurring Transaction Lifecycle

#### 1. Creation
A recurring rule is created with `status = active` and `nextDate = startDate`. No transactions are generated yet.

#### 2. Generation (`process-due` — on-demand, on app load)

The frontend calls `POST /recurring-transactions/process-due` when the app first loads (via `RecurringSyncProvider`). The backend:

1. Computes today's date (`YYYY-MM-DD`) using the server's local time.
2. Finds all active rules where `nextDate <= today`.
3. For each rule, **inside a Sequelize transaction**:
   - Iterates from `nextDate` to `today`:
     - **Skip check**: queries `RecurringSkip` with `paranoid: false` — if a skip exists (even soft-deleted), the date is skipped.
     - **Existence check**: queries `Transaction` with `paranoid: false` — if a generated transaction already exists (even soft-deleted), the date is NOT regenerated. This prevents re-creating user-deleted occurrences.
     - **If neither**: creates a `Transaction` row stamped with `recurringTransactionId` and the occurrence `date`.
     - **Advances**: calls `computeNextDate()` to get the next scheduled date.
   - After the loop, updates `recurringTransaction.nextDate` past today.
4. Returns `{ generated: count, errors: [] }`.

**Idempotency** is guaranteed by:
- The composite unique index `(recurringTransactionId, date)` on the `transactions` table — the database rejects duplicate inserts at the constraint level.
- The `paranoid: false` existence check — the generator sees both live and soft-deleted rows, so deleted occurrences are never regenerated.

#### 3. Editing an occurrence vs. the series

- **Edit this occurrence only**: use `PATCH /transactions/:id`. Works on any transaction (manual or generated). The template is untouched.
- **Edit the series (this & future)**: use `PATCH /recurring-transactions/:id`. Updates the template — only affects occurrences not yet generated. Already-generated transactions are historical and immutable.

#### 4. Skipping individual occurrences

Use `POST /recurring-transactions/:id/skip` with `{ occurrenceDate }`. This creates a `RecurringSkip` row. The generator checks for skips before each creation.

Use `DELETE /recurring-transactions/:id/skip?occurrenceDate=...` to un-skip a date (only makes sense for future dates — a past occurrence that was skipped cannot be retroactively generated).

#### 5. Pausing and cancelling

- **Pause**: `PATCH /recurring-transactions/:id { status: "paused" }`. The `nextDate` is preserved — no occurrences are lost. Resume with `{ status: "active" }`.
- **Cancel**: `DELETE /recurring-transactions/:id` (soft-delete). Future generation stops. Already-generated transactions remain as financial history.

#### 6. Deleting a generated transaction

A soft-deleted generated transaction (`deletedAt` set) still occupies the unique index slot `(recurringTransactionId, date)`. The generator skips it (via `paranoid: false` existence check), so it will **not be regenerated**. This is intentional — deleting a generated occurrence means you don't want it in your finances.

---

### Budget & Category Integration

#### Budgets — no changes needed

`BudgetsService.getStats` computes dashboard statistics by querying `transactions` filtered by `categoryId` + `date` range (the target month). Generated recurring transactions carry the rule's `categoryId` and a `date` within the target month, so they **automatically count toward budget spending** without any code changes.

Since `processDue` only generates occurrences with `date <= today`, no future-dated transactions pollute future months' budget calculations.

#### Category deletion

When a category is deleted (`CategoriesService.delete`), the service atomically reassigns both:
- All `Transaction` rows referencing that category
- All `RecurringTransaction` rules referencing that category

...to the fallback category of the same type (`isFallback = true`). This happens inside a single Sequelize transaction, preventing dangling foreign keys in both tables.

---

### Frontend Orchestration

#### RecurringSyncProvider (ready gate)

A React context provider placed inside `AuthGuard` in `ToolsLayout`. On mount, it calls `POST /process-due` and exposes `{ ready, error }`.

This is critical: React runs child effects before parent effects. Without the `ready` gate, the dashboard would fetch stats **before** `processDue` completes, showing stale data on the first render.

| Page | Gate behaviour |
|------|---------------|
| **Dashboard** | Reads `useRecurringSync()`. Shows skeleton until `ready`, then calls `fetchStats`. Generated transactions are always reflected. |
| **Transactions** | Passes `enabled={ready}` to `useTransactions()`. The hook's fetch effect does not fire until `ready`. Shows skeleton in the meantime. |
| **Recurring** | Reads `useRecurringSync()`. Shows skeleton until `ready`, then renders the recurring rules list. |

#### TransactionCard recurring badge

When a transaction has `recurringTransactionId` set, the card shows a clickable "recurring" badge with a `RepeatIcon`. Clicking the badge navigates to `/economy/recurring` (to edit the series). Clicking anywhere else on the card opens the normal occurrence edit modal.

---

### Development

```bash
# Install dependencies
npm install

# Start all services (MySQL, API, Web)
docker compose up -d

# Or run individually
cd apps/api && npm run dev    # API at :3001
cd apps/web && npm run dev    # Web at :3000
```

```bash
# Type-check, test, and build
npx tsc --noEmit && npm test && npm run build
```
