# Subscription Architecture Review

## Executive Summary

Mercury currently models subscriptions (Netflix, Spotify, ChatGPT, etc.) as ordinary recurring expenses — a `RecurringTransaction` row with `type: 'expense'`, a frequency/interval, and an optional `Category`. A codebase-wide search found **zero** references to `subscription`, `isSubscription`, `tag`, or `metadata` in `apps/api`, `apps/web`, or `packages/shared`. There is no Subscription concept anywhere; a Netflix charge is indistinguishable from rent except by the user's choice of `description` and `categoryId`.

After analyzing the backend models, services, routes, schemas, and the frontend hooks/components/pages, I recommend **against** introducing a dedicated Subscription domain. Subscriptions are a *specialized recurring expense*, not a distinct bounded context — the recurrence mechanics (scheduling, generation, idempotency, skip) are identical whether the recurring is Netflix or rent. A parallel `Subscription` entity would either duplicate the `processDue` generation engine or create an ambiguous ownership boundary ("does Subscription generate transactions itself, or delegate to RecurringTransaction?"), and would have to re-integrate with the budget cascade, the category-deletion cascade (`categories.service.ts:38-62`), and the `RecurringSyncProvider` ready-gate.

Most proposed subscription features are **derivable queries over existing data**, not new state:

- Monthly/yearly subscription cost → aggregate active recurring expenses by `amount`/`frequency`/`interval`.
- Upcoming renewals → query `RecurringTransaction.nextDate` (already indexed at `recurring-transaction.model.ts:62-64`) in a date range.
- Subscription categories (Streaming, AI, Cloud, Productivity) → ordinary `Category` records the user already manages.
- Subscription insights → aggregate transactions by category (the pattern `BudgetsService.getStats` already uses at `budgets.service.ts:105-128`).

The only genuinely new capability in the proposal is **price-change history**, which is orthogonal (equally useful for rent/insurance/salary) and, per the confirmed scope, speculative.

**Recommendation:** extend `RecurringTransaction` with a lightweight `kind` discriminator plus a forward-looking `upcoming` query and a Subscriptions frontend view. This delivers ~90% of the proposed value at a fraction of the complexity, reuses the entire generation engine and the existing `RecurringPage` UI scaffolding, and leaves the door open for optional metadata columns or a price-history table if real demand emerges. **Confidence: Medium-High.**

---

## Current Architecture

### How subscriptions are currently represented

A Netflix-style subscription is created via `POST /api/v1/recurring-transactions` with a body like:

```json
{
  "type": "expense",
  "amount": 15.99,
  "description": "Netflix",
  "date": "2026-01-05",
  "frequency": "monthly",
  "interval": 1,
  "dayOfMonth": 5,
  "categoryId": "<Entertainment>"
}
```

It is stored as a row in `recurring_transactions` (`apps/api/src/models/recurring-transaction.model.ts:16-80`). There is no field that marks it as a subscription; the only "subscription-ness" lives in the free-text `description` (VARCHAR 255, `:47-48`) and the user-chosen `categoryId`.

### Data models

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

**Unique composite index**: `(recurringTransactionId, date)` — ensures the same recurring occurrence is never generated twice.

> Source: `apps/api/src/models/transaction.model.ts`

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

**Associations**: `BelongsTo(User)`, `BelongsTo(Category)`, `HasMany(Transaction)`, `HasMany(RecurringSkip)`.

> Source: `apps/api/src/models/recurring-transaction.model.ts`

#### RecurringSkip (`recurring_skips` table)
| Column | Type | Notes |
|--------|------|-------|
| `id` | CHAR(36) PK | UUID v4 |
| `recurringTransactionId` | CHAR(36) FK | Indexed, NOT NULL |
| `occurrenceDate` | DATEONLY | Date to skip |

**Unique composite index**: `(recurringTransactionId, occurrenceDate)` — a date cannot be skipped twice.

> Source: `apps/api/src/models/recurring-skip.model.ts`

#### Category (`categories` table)
| Column | Type | Notes |
|--------|------|-------|
| `id` | CHAR(36) PK | UUID v4 |
| `userId` | CHAR(36) FK | Indexed |
| `name` | VARCHAR(100) | Unique per (userId, name) |
| `color` | VARCHAR(7) | Nullable hex `#RRGGBB` |
| `type` | ENUM(`income`, `expense`) | |
| `isFallback` | BOOLEAN | Default `false` |

No `icon` field exists despite design docs potentially referencing one.

> Source: `apps/api/src/models/category.model.ts`

#### Budget (`budgets` table)
| Column | Type | Notes |
|--------|------|-------|
| `id` | CHAR(36) PK | UUID v4 |
| `userId` | CHAR(36) FK | Indexed |
| `name` | VARCHAR(100) | Unique per (userId, name) |
| `value` | DECIMAL(10,2) | Allocated/limit amount |
| `period` | ENUM(`monthly`) | Only monthly supported |

Categories are grouped via a `BelongsToMany` through `budget_categories` join table (`budget-category.model.ts`).

> Source: `apps/api/src/models/budget.model.ts`

### How the recurrence generation engine works

`processDue(userId)` in `apps/api/src/services/recurring-transactions.service.ts:83-171`:

1. Computes today's date (`YYYY-MM-DD`) in server local time.
2. Finds all active recurrings where `nextDate <= today` (`WHERE userId, status='active', nextDate <= today`).
3. For each recurring, **inside a Sequelize transaction**:
   - Walks `currentDate` from `nextDate` to `today` (or `endDate`).
   - **Skip check**: queries `RecurringSkip` with `paranoid: false` — if a skip row exists (even soft-deleted), skip.
   - **Existence check**: queries `Transaction` with `paranoid: false` — if a generated transaction already exists (even soft-deleted), do NOT regenerate.
   - **If neither**: creates a `Transaction` stamped with `recurringTransactionId` and the occurrence `date`.
   - Advances via `computeNextDate()` (`:181-232`), which handles per-frequency date math with month-length clamping.
   - Updates `recurringTransaction.nextDate` to the next future occurrence.
4. Returns `{ generated: N, errors: [...] }` — errors per recurring are collected, not thrown.

**Idempotency** is guaranteed by:
- The composite unique index `idx_transactions_recurring_date` on `(recurringTransactionId, date)` — the database rejects duplicate inserts at the constraint level.
- The `paranoid: false` existence check — the generator sees both live and soft-deleted rows, so user-deleted occurrences are never regenerated.

### How skip/pause/cancel works

- **Skip individual occurrence** (`skipDate` / `unskipDate`, `:61-81`): `findOrCreate` a `RecurringSkip`; unskip soft-deletes it.
- **Pause / Cancel**: the `status` enum (`'active'|'paused'|'cancelled'`) exists on the model (`recurring-transaction.model.ts:72-73`) and `processDue` queries `status: 'active'` only. However, `status` is **not** in `createRecurringTransactionSchema` or `updateRecurringTransactionSchema` (`apps/api/src/schemas/recurring-transaction.schema.ts`) — there is **no API path to pause or cancel** a recurring transaction. The only way to stop future generation is `DELETE` (soft-delete the entire recurring row).

### How budgets integrate

`BudgetsService.getStats` at `apps/api/src/services/budgets.service.ts:83-143`:

1. Builds `startDate`/`endDate` for the target month from `(year, month)`.
2. Sums total income and total expenses from `Transaction` for the user + date range.
3. Loads budget → category mappings and expense transactions with `categoryId`.
4. Performs an in-memory join: for each budget, filters expense transactions whose `categoryId` is in the budget's `categoryIds`, sums `amount`, computes `progress`/`status` thresholds (≥100 → `over`, ≥80 → `warning`, else `under`).

Generated recurring transactions carry the rule's `categoryId` and a `date` within the target month, so they **automatically count toward budget spending** without any subscription-specific code.

**Key limitation**: `getStats` is purely backward-looking (actual transactions in a date range). There is no forward-looking query ("expected charges this month from recurrings") — but `nextDate` is already indexed and could support one cheaply.

### How category deletion cascades

`CategoriesService.delete` at `apps/api/src/services/categories.service.ts:38-62`:

1. Refuses to delete the fallback category → 403.
2. Finds the per-type fallback (expense → "Others", income → "Other Income").
3. Inside a transaction, bulk-updates **both** `Transaction.categoryId` and `RecurringTransaction.categoryId` to the fallback id.
4. Soft-deletes the category.

**Implication**: deleting a "Subscriptions" category silently reassigns every subscription recurring into "Others" with no warning — the grouping is silently lost.

### Frontend architecture

**Router** (`apps/web/src/App.tsx:22-69`):

| Path | Page | Gated? |
|------|------|--------|
| `/` | `LandingPage` | No |
| `/economy` (layout) | `ToolsLayout` → `EconomyLayout` | Auth + RecurringSync |
| `/economy/dashboard` | `DashboardPage` | `ready` |
| `/economy/budgets` | `BudgetSettingsPage` | No |
| `/economy/transactions` | `TransactionsPage` | `ready` |
| `/economy/recurring` | `RecurringPage` | `syncReady` |

**RecurringSyncProvider** (`apps/web/src/components/transactions/RecurringSyncProvider.tsx:23-48`): on mount calls `POST /recurring-transactions/process-due`; exposes `{ ready, error }`. `ready` becomes `true` on both success and error — the gate waits for the call to settle. Consumed by `DashboardPage`, `TransactionsPage`, and `RecurringPage` to prevent stale first renders (React child effects fire before parent effects, so without the gate, pages would fetch before `processDue` completes).

**Hooks** (`apps/web/src/hooks/`):

| Hook | Endpoints | Return |
|------|-----------|--------|
| `useUser` | `GET /users/me` | `{ user, loading, error, refetch }` |
| `useCategories` | CRUD `/categories` | `{ categories, loading, error, handleCreate, handleUpdate, handleDelete }` |
| `useTransactions(enabled)` | CRUD `/transactions` | `{ transactions, loading, error, modal, categories, ... }` |
| `useRecurringTransactions` | CRUD `/recurring-transactions`, `/process-due`, `/skip`, `/unskip` | `{ recurringTransactions, loading, error, processDue, handleCreate, handleUpdate, handleDelete, handleSkip, handleUnskip, resetCache }` |
| `useBudgets` | CRUD `/budgets`, `/stats` | `{ budgets, stats, loading, error, handleCreate, handleUpdate, handleDelete, fetchStats }` |

**Key observation**: `useRecurringTransactions` exposes `handleSkip`/`handleUnskip` (`useRecurringTransactions.ts:122-154`) but `RecurringPage` does **not** surface them — the skip/pause/cancel UX is absent on the frontend despite backend and hook support.

**TransactionCard recurring badge** (`apps/web/src/components/transactions/TransactionCard.tsx:42-51`): when `transaction.recurringTransactionId` is set, shows a clickable "recurring" badge with a `RepeatIcon`. Clicking navigates to `/economy/recurring` (to edit the series). This pattern can be reused by a Subscription view.

### Shared types

From `packages/shared/src/index.ts`, re-exported from:

- `User`: `{ id, email, name, provider, providerId, createdAt, updatedAt }`
- `Transaction`: `{ id, userId, type, amount, description, date, categoryId, category?, recurringTransactionId, createdAt, updatedAt }`
- `Category`: `{ id, userId, name, color, type, isFallback, createdAt, updatedAt }`
- `Budget` / `BudgetStats` / `BudgetStat`: budget + computed stats
- `RecurringTransaction`: `{ id, userId, categoryId, category?, type, amount, description, frequency, interval, startDate, endDate, nextDate, dayOfMonth, dayOfWeek, status, createdAt, updatedAt }`
- `RecurringSkip`: `{ id, recurringTransactionId, occurrenceDate, createdAt, updatedAt }`
- `ApiResponse<T>`: `{ success, data?, error?, meta? }`

**No subscription type exists.**

### Current strengths

1. **Unified, proven generation engine.** `processDue` handles catch-up, idempotency, per-recurring isolation, and soft-delete-aware regeneration in one place. Any "subscription" already benefits from it with no special-casing.
2. **First-class generated transactions.** Occurrences are real `Transaction` rows — appear in lists, count toward budgets, are individually editable, and link back to their series via `Transaction.recurringTransactionId`. The `TransactionCard` recurring badge already navigates to the series.
3. **Budget integration is free.** No subscription-specific code needed for subscription spend to flow into budget tracking — just shared categories.
4. **Flat, low-ceremony backend.** Adding a route/model/service follows one established pattern, and `sequelize.sync({ alter: true })` means schema changes in dev require no migrations.
5. **Skip semantics already exist** and are idempotent via the `RecurringSkip` unique index.

### Current limitations

1. **No way to robustly distinguish subscriptions from other recurrings.** The only options today are `description` (free text, unqueryable) or `categoryId` (user-managed and deletable). No typed discriminator exists.
2. **Category-as-grouping is fragile.** Deleting a "Subscriptions" category silently reassigns every subscription recurring to the fallback "Others" (`categories.service.ts:50-58`), losing the grouping without warning.
3. **No forward-looking view.** `getStats` is purely backward-looking (actual transactions in a month). There is no "upcoming renewals this month" query, even though `nextDate` is already indexed.
4. **Pause/cancel are unreachable via the API.** `status` exists on the model and `processDue` honors it, but the Zod schemas strip it from input.
5. **No structured metadata home.** No `provider`, `plan`, `billingUrl`, `trialEndDate`, or tags on any model. `description` (VARCHAR 255) is the only free-text column.
6. **Currency inconsistency** (`$` in `TransactionForm`/`TransactionCard`; `€` in `BudgetForm`/`MonthlySummary`/`BudgetProgress`) — a pre-existing wart a new view should not propagate.

---

## Option 1 – Keep the Current Design

Status quo: subscriptions are recurring expenses the user categorizes manually. No schema, model, route, or frontend changes.

### Pros

- **Zero cost.** Nothing to build, migrate, test, or maintain.
- **Maximum simplicity.** One recurrence domain, one mental model, one generation engine.
- **Subscriptions already work.** Netflix as a monthly recurring expense generates transactions, counts toward budgets, and shows a recurring badge today.
- **No duplication risk.** No second code path that could drift out of sync with `processDue`.
- **No new code to maintain or test.** Passes coverage gates trivially.

### Cons

- **No robust grouping.** Relying on a "Subscriptions" category is fragile (deletion cascade silently breaks grouping) and on `description` is unqueryable. A user could have 10 subscriptions but no way to reliably list them as a group.
- **No upcoming-renewals view.** The data exists (`nextDate`, indexed) but there is no endpoint or page to surface it. Users cannot see what recurring charges are due in the next 30 days.
- **No monthly/yearly subscription total.** Derivable only by the client filtering the full recurring list — no dedicated aggregation; different from "total recurring expenses" which would include rent/mortgage.
- **No subscription-specific UX.** A "subscriptions dashboard" would have nowhere to live without overloading the Recurring page with filters that have no database backing.
- **The pause/cancel API gap remains** regardless of this decision.

### Long-term impact

The product can ship subscription *content* only by convention (user-created categories + descriptions). Every subscription feature request becomes a frontend filter over the recurring list, with no backend support and no typed guarantee that the grouping is intact. As subscription-related requests accumulate, pressure grows for ad-hoc flags scattered across the codebase — the worst of both worlds (no clean model, but also no simplicity).

---

## Option 2 – Introduce a Dedicated Subscription Domain

A new `Subscription` entity with its own model (`subscriptions` table), service, routes (`/api/v1/subscriptions`), Zod schemas, shared types, hook (`useSubscriptions`), and a `SubscriptionsPage`. It would carry subscription-specific fields (provider, plan, billingUrl, trialEndDate, maybe price history) and potentially its own generation/processing.

### Pros

- **Strongest domain expression** of "subscription as a first-class concept." Clear separation from generic recurring expenses.
- **Clean home for subscription-specific metadata** (provider, plan, trial, cancellation URL) without polluting `RecurringTransaction`.
- **Price-change history** can be modeled naturally as a child collection of `Subscription`.
- **Subscription-only features** (cancellation workflows, provider catalog, renewal notifications) have an obvious, isolated implementation surface.
- **Clear API/frontend separation** — `/api/v1/subscriptions` and a dedicated `SubscriptionsPage` tab are self-documenting for both developers and users.

### Cons

- **Duplicate or ambiguous generation logic.** Either `Subscription` re-implements `processDue`/`computeNextDate`/idempotency/skip (large duplication, drift risk, two places to fix scheduling bugs), or it delegates to/wraps a `RecurringTransaction` (then `Subscription` is a thin facade and the "domain" is mostly metadata — which a discriminator column achieves more cheaply).
- **Two parallel recurring concepts** confuse users and the data model: is rent a subscription? Is a yearly software license a subscription? Is a salary a subscription? The boundary is subjective and unstable.
- **Re-integration cost.** A `Subscription` must participate in: budget spending (so generated transactions need a `categoryId` and must flow through the same `Transaction` model), category-deletion cascade (`categories.service.ts:38-62` currently reassigns `Transaction` + `RecurringTransaction` — a third target must be added), and the `RecurringSyncProvider` ready-gate (needs a second `process-due`-like call or a unified one — otherwise subscriptions lag behind the ready signal, causing stale renders on Dashboard/Transactions pages).
- **Largest blast radius.** New model + service + routes + schemas + shared types + hook + page + skeleton + error + tests for everything above, plus migration/seed considerations. Against the 80%/70% coverage gates, this is a substantial test burden. Rough estimate: ~15-20 new/modified files, ~25-30 new test specs.
- **Speculative value.** Per the confirmed scope, the advanced features that justify the metadata (price history, cancellation workflows, provider catalog) are "could eventually," not committed. Building the domain now is building for demand that may not materialize.
- **Breaks the "one generation engine" invariant** that makes the current architecture easy to reason about. Engineers must know that "recurring transactions generate" *and* "subscriptions generate" and keep both in mind when debugging.

### Long-term impact

If and when subscription-specific behavior truly diverges — real cancellation workflows with notice periods, a provider catalog with auto-fill, renewal notifications with configurable lead times, subscription price-history charts with trend lines — a dedicated domain eventually pays off. But that divergence is speculative today. Shipping it now risks a parallel domain that mostly mirrors `RecurringTransaction`: two read paths, two write paths, two places to fix scheduling bugs, two places to update when `computeNextDate` logic changes. The maintenance tax starts on day one; the payoff is uncertain and deferred.

---

## Alternative Approaches

### A. Subscription category only

Create a "Subscriptions" `Category` and group recurrings by it. A `SubscriptionsPage` filters `recurringTransactions` where `category?.name === 'Subscriptions'` and renders upcoming renewals from `nextDate`.

**Rejected as sole solution.** Fragile: deleting the category silently reassigns all subscription recurrings to the fallback "Others" (`categories.service.ts:50-58`), destroying the grouping with no signal. Also cannot distinguish sub-groupings (Streaming vs AI vs Cloud) without creating many categories, and carries no typed guarantee that a recurring IS a subscription. Cheap (~0 backend work, ~1 frontend page) but brittle.

**Value delivered:** ~55%.

### B. `isSubscription` boolean on `RecurringTransaction`

A single nullable boolean column `isSubscription` (default `false`) on `recurring_transactions`. Queryable via `WHERE isSubscription = true`, survives category deletion, typed. Powers a subscriptions view and upcoming-renewals query.

**Rejected in favor of `kind` enum (E).** A boolean is binary and does not extend. If a future `kind: 'savings'` or `kind: 'loan'` is needed, a boolean requires either a second boolean (growing ad-hoc) or a migration from boolean to enum. A `kind` enum costs the same now and has more headroom.

**Value delivered:** ~80%.

### C. Metadata JSON column on `RecurringTransaction`

A flexible `metadata: JSON` column to hold `{ provider, plan, billingUrl, trialEndDate }` ad hoc.

**Rejected.** Loses the Zod type safety the codebase values (JSON must be validated with a custom schema or cast). MySQL JSON columns are harder to index and query than typed columns (`WHERE metadata->>'$.provider' = 'Netflix'` is slow without virtual generated columns). Validation becomes hand-rolled rather than declarative Zod. Introduces an untyped escape hatch that tends to accumulate unstructured cruft over time. Only worth it if many truly unpredictable optional fields are needed — which is not the case here (the field set is small and well-known).

**Value delivered:** ~80% (with degraded type safety).

### D. Tags system (many-to-many)

A `Tag` model (`id`, `userId`, `name`, `color`) + join tables on `Transaction`/`RecurringTransaction` + tag CRUD UI (tag manager, multi-select, filtering). Flexible and multi-dimensional — "subscription" is one tag, "streaming" is another, "annual" is another.

**Rejected for this use case.** It is a large subsystem (model, join tables, routes, hook, tags manager UI, tests) built to serve a single grouping need — over-engineered by at least 4x. Tags are also untyped strings: they don't carry structured subscription metadata any better than a category. Justifiable only if multiple orthogonal labeling needs emerge across the entire app (e.g., tags for tax categories, tags for split-expense grouping, tags for notes), which they haven't.

**Value delivered:** ~75% (but with very high cost-to-value ratio).

### E. Extend `RecurringTransaction` with a `kind` discriminator + forward-looking query *(recommended)*

Add a `kind` enum (`'generic' | 'subscription'`, default `'generic'`) to `recurring_transactions`. Add `GET /recurring-transactions/upcoming?from=&to=` using the existing `nextDate` index. Add a `SubscriptionsPage` that filters `kind='subscription'` and reuses `RecurringTransactionCard`/`RecurringTransactionForm`. Optionally surface `status` in the update schema (fixes the pause/cancel API gap for *all* recurrings, subscriptions or not).

**This is the recommended path.** See Recommendation for the concrete implementation sketch.

**Value delivered:** ~90%.

### F. Price-history table (orthogonal, deferred)

A `recurring_price_changes` table (`id`, `recurringTransactionId`, `oldAmount`, `newAmount`, `effectiveDate`, `createdAt`) recording amount changes. **Deferred as speculative** per the confirmed scope. Notably, this benefits *all* recurring transactions (rent increases, insurance adjustments, salary raises), not just subscriptions — so it is orthogonal to the subscription-domain question and should be evaluated on its own architectural merits when demand is real.

### G. Dedicated Subscriptions frontend page without backend changes

A `SubscriptionsPage` that filters `recurringTransactions` client-side by `description` or `categoryId`, computes upcoming renewals from `nextDate`, and aggregates monthly/yearly totals. No backend changes at all (not even a `kind` column).

**Rejected as sole solution.** Works but is purely cosmetic — same fragility as the category-only approach, just moved one layer up. The grouping lives only in the frontend filter and silently breaks on category deletion. No typed guarantee. Still has no metadata home. A discriminator column is so cheap (one nullable enum, alter:true on restart) that skipping it saves negligible effort while sacrificing long-term robustness.

**Value delivered:** ~60%.

---

## Cost / Benefit Analysis

| Dimension | Option 1 (Status quo) | Option 2 (Dedicated domain) | **Option E (Discriminator + upcoming)** |
|---|---|---|---|
| **Dev effort** | None | High: new model, service, routes, schemas, shared types, hook, page, skeleton, error, tests (~15-20 files) | Low–Medium: one column, one endpoint, one page reusing existing components (~6-8 files) |
| **Database impact** | None | New `subscriptions` table + foreign keys + cascade integration; sync({alter}) or future migration | One nullable ENUM column on existing `recurring_transactions` table (sync({alter}), non-breaking, no migration in dev) |
| **Backend impact** | None | New service must replicate or wrap `processDue`/`computeNextDate`; integrate with category-delete cascade; integrate with budget getStats; new routes | Add `kind` to model + Zod schema; add `upcoming` service method + route; optionally expose `status` in update schema (fixes existing gap) |
| **Frontend impact** | None | New `useSubscriptions` hook + `SubscriptionsPage` + skeleton + error + tab + form + card components (~8-10 files) | New `SubscriptionsPage` reusing `RecurringTransactionCard`/`RecurringTransactionForm`; new tab in `EconomyLayout`; small dashboard aggregation card (~4-6 files) |
| **Migration complexity** | None | High: must decide whether existing "subscription-like" recurrings are migrated into the new table (heuristic-based or manual), or dual-write during transition | Low: existing rows default to `kind='generic'` (null-safe); users opt in per recurring; no data migration needed |
| **Future maintainability** | Degrades as ad-hoc filters and "is-subscription?" conventions accumulate across the codebase | Two parallel recurring concepts to keep in sync (scheduling bugs fixed in two places, skip logic in two places, idempotency in two places) | One recurring domain with a scoped discriminator; `kind` enum extends cleanly to future kinds; metadata columns or price-history table can be added orthogonally |
| **Test burden** | None (existing tests pass) | Large: new model spec, service spec, route spec, hook spec, page spec — each must clear 80% stmts / 75% branches (backend) and 70% / 65% (frontend) | Small: extend existing recurring schema/route/service tests for `kind` + `upcoming`; new `SubscriptionsPage` spec |
| **User-facing value** | ~50%: subscriptions "work" by convention only; no grouping, no renewals view, no totals | ~95%: all proposed features addressable if all speculative features eventually ship | ~90%: grouping, upcoming renewals, dedicated view, monthly/yearly totals — the confirmed near-term needs |
| **Risk** | Low: no change = no regression risk | High: duplicated logic, regression across two parallel domains, cascade integration bugs | Low: minimal schema change (nullable column), new endpoint is read-only (no write-path changes to `processDue`) |

---

## Recommendation

**Adopt Option E: extend `RecurringTransaction` with a `kind` discriminator, add a forward-looking `upcoming` endpoint, and add a Subscriptions frontend view. Do not introduce a dedicated Subscription domain. Defer price-history tracking and subscription-specific metadata columns (provider, plan, billingUrl, trialEndDate) until real demand materializes.**

### Why this option

1. **Domain correctness.** A subscription is a specialized recurring expense, not a separate bounded context. The behavior that differs (grouping, forward-looking views, cost aggregation) is query/view logic, not state that demands a new aggregate root. The behavior that is identical (scheduling, generation, idempotency, skip) stays in one place — the single `processDue` engine — which is the correct separation of concerns.

2. **Simplicity.** One nullable ENUM column, one read-only endpoint, one frontend page that reuses existing components (`RecurringTransactionCard`, `RecurringTransactionForm`, `RecurringSyncProvider` ready-gate). No new model, no new service, no new generation path, no cascade re-integration, no dual-write concerns.

3. **Maintainability.** One recurring domain to reason about. When `computeNextDate` gets a bug fix or a new frequency, it benefits subscriptions automatically. When `processDue` gets an optimization, subscriptions benefit automatically. No drift between two parallel implementations.

4. **Extensibility.** The `kind` enum extends to future kinds (`'savings'`, `'loan'`, `'investment'`) without schema redesign. Optional metadata columns (`provider`, `plan`, `billingUrl`, `trialEndDate`) can be added as nullable columns later with zero risk — `sync({alter:true})` in dev, non-breaking. A `recurring_price_changes` table can be added orthogonally, serving all recurring kinds.

5. **Lowest cost-to-value ratio.** Delivers ~90% of the proposed value at ~15-20% of the cost of Option 2.

### Why the alternatives were rejected

| Alternative | Key reason for rejection |
|---|---|
| Option 1 (status quo) | Leaves subscription grouping as a fragile convention; no forward-looking view; pressure for ad-hoc flags will accumulate |
| Option 2 (dedicated domain) | Duplicates or wraps the generation engine; re-introduces cascade integration; pays large maintenance tax for speculative features |
| Category only (A) | Fragile under category deletion; no typed guarantee; no metadata home |
| `isSubscription` boolean (B) | Workable but lacks extensibility of a `kind` enum at same cost |
| JSON metadata (C) | Untyped; hard to validate/query with MySQL; violates the codebase's typed style |
| Tags (D) | Large subsystem for a single grouping need; untyped; over-engineered |
| Frontend-only view (G) | Purely cosmetic grouping; silently breaks on category deletion; saves negligible effort vs. a proper discriminator |

### Concrete implementation sketch

> This is a planning sketch, not implementation. Per `AGENTS.md`, `sequelize.sync({ alter: true })` runs on API startup in dev, so adding a nullable column or enum requires no manual migration — just model changes. Migrations are deferred to pre-production.

#### Shared types (`packages/shared/src/types/recurring-transaction.ts`)

Add to `RecurringTransaction`:

```ts
kind: 'generic' | 'subscription';
```

#### Backend

**Model** (`apps/api/src/models/recurring-transaction.model.ts`):

Add column:

```ts
@Column({
  type: DataType.ENUM('generic', 'subscription'),
  defaultValue: 'generic',
})
kind!: 'generic' | 'subscription';
```

Existing rows default to `'generic'` on alter — no data migration needed.

**Zod schemas** (`apps/api/src/schemas/recurring-transaction.schema.ts`):

Add to both `createRecurringTransactionSchema` and `updateRecurringTransactionSchema`:

```ts
kind: z.enum(['generic', 'subscription']).optional(),
```

Separately, consider adding the currently-unreachable `status` field to `updateRecurringTransactionSchema` to close the existing pause/cancel API gap:

```ts
status: z.enum(['active', 'paused', 'cancelled']).optional(),
```

This benefits *all* recurring transactions, not just subscriptions.

**Service** (`apps/api/src/services/recurring-transactions.service.ts`):

Add two methods:

```ts
async findUpcoming(userId: string, from: string, to: string): Promise<RecurringTransaction[]>
```

Queries `RecurringTransaction.findAll({ where: { userId, status: 'active', nextDate: { [Op.between]: [from, to] } }, include: [Category] })`. Returns all active recurrings (both `kind: 'generic'` and `kind: 'subscription'`) whose next occurrence falls in the date range. The frontend can filter by `kind` client-side or a `kind` query param can be added.

```ts
async getSubscriptionSummary(userId: string): Promise<{ monthlyTotal: number; yearlyTotal: number; count: number }>
```

Aggregates active recurrings with `kind='subscription'`: yearly = sum of amount × occurrences-per-year (12 for monthly, 52 for weekly, 365 for daily, 1 for yearly), monthly = yearly / 12.

**Routes** (`apps/api/src/routes/recurring-transactions.routes.ts`):

Add (declared *before* `/:id`, matching the existing `/process-due`-before-`/:id` ordering):

```
GET /upcoming?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /subscription-summary
```

**`app.ts`**: no new mount needed — both endpoints live under the existing `/api/v1/recurring-transactions` prefix.

#### Frontend

**Router / layout** (`apps/web/src/App.tsx`, `apps/web/src/pages/tools/economy/EconomyLayout.tsx`):

Add a 5th `NavLink`:

```
/economy/subscriptions → SubscriptionsPage
```

With `ErrorBoundary` and `Suspense` following the existing pattern (co-located `SubscriptionsError.tsx`, `SubscriptionsSkeleton.tsx`). The page gated on `useRecurringSync().ready`.

**Hook** (`apps/web/src/hooks/useRecurringTransactions.ts`):

Add:

- `fetchUpcoming(from, to)` — calls `GET /recurring-transactions/upcoming?from=&to=`
- `fetchSubscriptionSummary()` — calls `GET /recurring-transactions/subscription-summary`
- The existing `recurringTransactions` array is already filterable by `kind` client-side (no need for a separate `useSubscriptions` hook)

**New page** (`apps/web/src/pages/tools/subscriptions/`):

```
SubscriptionsPage.tsx
SubscriptionsSkeleton.tsx
SubscriptionsError.tsx
SubscriptionsPage.module.css
```

`SubscriptionsPage` composition:

1. **Summary cards** (top): monthly subscription total, yearly subscription total, active subscription count. Data from `fetchSubscriptionSummary()`.
2. **Upcoming renewals** (middle): list of subscription recurrings whose `nextDate` is in the next 30 days (or user-selected range). Data from `fetchUpcoming()`. Each item reuses `RecurringTransactionCard` (already supports edit/delete).
3. **All subscriptions** (bottom): the full list of `kind='subscription'` recurrings, filtered client-side from `recurringTransactions`. Reuses `RecurringTransactionCardList` + `RecurringTransactionForm` for create/edit. No new card or form component needed.
4. **Create button** opens `RecurringTransactionForm` with `kind` pre-set to `'subscription'`.

Reuses the existing `RecurringSyncProvider` ready-gate (already wrapping the entire `ToolsLayout`) — no new sync provider needed.

**Form** (`apps/web/src/components/transactions/RecurringTransactionForm.tsx`):

Add a `kind` selector to `RecurringTransactionFormData` and the form UI (default `'generic'`, shows a toggle or radio group: "Generic recurring" / "Subscription"). The form is already reused by both `RecurringPage` and the new `SubscriptionsPage`.

**Dashboard** (`apps/web/src/pages/tools/dashboard/DashboardPage.tsx`):

Optionally add a small "Subscriptions this month" card showing the monthly total (calls `fetchSubscriptionSummary()` alongside `fetchStats()` after the `ready` gate). Deferrable — `SubscriptionsPage` already shows this.

#### Testing impact

- Extend `apps/api/__tests__/recurring-transactions.service.spec.ts` for `findUpcoming` and `getSubscriptionSummary`.
- Extend `apps/api/__tests__/recurring-transactions.routes.spec.ts` for the new endpoints.
- Extend `apps/api/__tests__/recurring-transaction.schema.spec.ts` (if it exists) or the route tests for `kind` validation.
- Extend `apps/web/__tests__/hooks/useRecurringTransactions.spec.ts` for `fetchUpcoming` and `fetchSubscriptionSummary`.
- Add `apps/web/__tests__/pages/SubscriptionsPage.spec.tsx`.
- Extend `apps/web/__tests__/components/RecurringTransactionForm.spec.tsx` for the `kind` selector.

Total new tests: ~10-15, well within the 80%/70% coverage gates.

#### Explicitly deferred (speculative, not recommended now)

- `provider`, `plan`, `billingUrl`, `trialEndDate` columns — can be added as nullable columns later via `sync({alter:true})`, non-breaking.
- `recurring_price_changes` table — orthogonal to the subscription question; benefits all recurrings; evaluate when demand is real.
- Cancellation-workflow endpoints (`POST /cancel`, `POST /resume`) — the `status` field already exists; exposing it in the update schema covers basic pause/cancel. Workflow (notice periods, confirmation) is speculative.
- Subscription-specific analytics/charts — derivable from existing transaction data + `kind` filter.

---

## Risks

### Risk 1: The `kind` discriminator becomes insufficient

**Scenario:** Future subscription features (price history with provider-level grouping, multi-currency subscription tracking, cancellation workflows with notice periods and email notifications) grow complex enough that a single discriminator column on `RecurringTransaction` becomes awkward — too many subscription-specific columns polluting a generic table.

**Mitigation:** The recommended design does NOT preclude evolving to Option 2 later. The `kind` column is a clean discriminator; if subscription behavior diverges significantly, a migration path exists:
1. Add a `subscriptions` table with `recurringTransactionId` FK (one-to-one, optional).
2. Subscription-specific columns move to the `subscriptions` table.
3. `processDue` remains in `RecurringTransaction`; the `Subscription` module reads from both.
4. The frontend already has a dedicated `SubscriptionsPage` — the API change is hidden behind the hook.

This migration path is harder if you start with no discriminator and try to add one later (requiring a heuristic re-categorization of thousands of existing recurrings). Having `kind` from the start makes any future evolution cleaner.

### Risk 2: Pause/cancel becomes a subscription-only concern

**Scenario:** Exposing `status` in the update schema causes team members to associate pause/cancel with subscriptions specifically, missing that it applies to all recurrings equally.

**Mitigation:** Document in the API contract and the update schema that `status` is a first-class field of `RecurringTransaction`, not tied to `kind`. The subscription filter only affects the *view*; pause/cancel is a domain-agnostic lifecycle operation.

### Risk 3: The `kind` column is misused as a Swiss-army knife

**Scenario:** Over time, more kinds are added (`'loan'`, `'savings'`, `'investment'`, `'subscription-annual'`, `'subscription-monthly'`) and business logic starts switching on `kind` with `if/else` chains rather than keeping the recurring engine generic.

**Mitigation:** The `kind` column should remain a *view discriminator*, not a *behavior discriminator*. The recurrence engine (`processDue`, `computeNextDate`) should NEVER branch on `kind`. If a kind reaches a point where it needs different generation logic, it's time to split into a dedicated domain. Enforce this via code review and the recurring-transactions service architecture.

---

## Conclusion

Subscriptions are currently absent from the codebase as a first-class concept, but the infrastructure to support them — the recurring-transaction generation engine, the budget integration, the ready-gate sync provider, the frontend card/form components — is already in place and proven.

Of the seven alternatives evaluated, the recommended path (extending `RecurringTransaction` with a `kind` discriminator, adding a forward-looking `upcoming` query, and adding a `SubscriptionsPage` frontend view) provides the strongest balance:

| Criterion | Score |
|---|---|
| Simplicity | High — one column, one endpoint, one reused component set |
| Maintainability | High — one generation engine, no duplicated logic |
| Extensibility | High — `kind` enum extends cleanly; metadata columns can be added orthogonally |
| Domain correctness | High — subscription = specialized recurring, not separate bounded context |
| Cost-to-value ratio | Excellent — ~90% of proposed features at ~15-20% of the cost of a dedicated domain |
| Migration readiness | High — if subscription behavior truly diverges, a dedicated domain can be introduced later with a clean migration path via the existing discriminator |

The alternatives range from insufficient (category-only, frontend-only view — too fragile) to excessive (dedicated domain, tags system — too heavyweight for the confirmed scope). The recommended path intentionally leaves the door open: it does not preclude evolving toward a dedicated Subscription domain later if real divergence emerges, but it also does not pay the complexity tax for speculative features today.

---

## Confidence

**Medium-High.**

**Reasoning:**

- **High confidence** in the finding that "subscription" is absent from the codebase — exhaustive search across all three packages found zero matches.
- **High confidence** that the recurrence mechanics (scheduling, generation, idempotency, skip) are identical for subscriptions and generic recurring expenses — confirmed by reading the full `processDue` and `computeNextDate` implementations.
- **High confidence** that most proposed features are derivable queries — verified against the indexed `nextDate` field and the existing `getStats` aggregation pattern.
- **High confidence** that a dedicated Subscription domain would duplicate the generation engine — the `processDue` logic is tightly coupled to `RecurringTransaction` and `Transaction` models and cannot be cleanly extracted without either duplication or a leaky abstraction.
- **Medium confidence** in the long-term sufficiency of the `kind` discriminator — the main residual uncertainty is whether price-change history and cancellation workflows will eventually demand enough subscription-specific behavior to justify a full domain split. Per the confirmed scope those are speculative, and even if they materialize, the `kind` discriminator + orthogonal additions provide a clean migration path.

The recommendation is robust to the primary uncertainties: it delivers the confirmed value now, does not foreclose future evolution, and keeps the architecture simple and maintainable.
