# Subscriptions Feature Design

## Executive Summary

This document designs a **Subscriptions analytics** feature for Mercury. The feature helps users identify, organize, and analyze the digital services they pay for — Netflix, Spotify, ChatGPT, Claude, Cursor, Google One, etc. It is explicitly **not** a subscription management feature: no plan comparison, no trial tracking, no cancellation workflows, no provider integrations.

The design introduces a minimal `Subscription` entity that acts as an **analytics classification overlay** on the existing `RecurringTransaction`. A Subscription carries exactly one piece of data that the recurring engine cannot hold: the `serviceType` (Streaming, AI, Cloud, Productivity, Music, Gaming). Everything else — amount, frequency, next renewal date, payment status — comes from the linked `RecurringTransaction`, which remains the single source of truth for recurrence generation.

This is the minimal form of the composition model (Subscription *has-a* RecurringTransaction) recommended in the prior domain review. The entity exists but starts with four real fields. Future metadata (provider, plan, notes, website, price history) can be added to the `Subscription` entity without touching `RecurringTransaction` — clean evolution, no refactor.

---

## Product Goals

1. **Identify**: let users mark which recurring transactions are digital subscriptions (vs. generic obligations like rent or insurance).
2. **Organize**: classify each subscription by service type (Streaming, AI, Cloud, Productivity, Music, Gaming).
3. **Analyze**: compute monthly/yearly cost, upcoming renewals, cost by service type, most expensive subscriptions, and share-of-spending metrics.
4. **Integrate**: surface a compact subscription summary on the existing dashboard.

**Non-goals** (explicitly excluded from V1): subscription management, plan comparison, trial management, billing portals, cancellation workflows, provider integrations, automatic subscription detection, external APIs.

---

## User Value

| User question | How the feature answers it |
|---|---|
| "How much do I spend on digital services per month?" | Monthly subscription cost (active subscriptions normalized to monthly) |
| "What's my annual subscription spend?" | Yearly subscription cost |
| "How many active subscriptions do I have?" | Active subscription count |
| "What's renewing soon?" | Upcoming renewals (from `RecurringTransaction.nextDate`, already indexed) |
| "Where does my subscription money go?" | Cost by service type (group by `serviceType`, sum normalized monthly) |
| "Which subscriptions are most expensive?" | Sorted list by normalized monthly cost |
| "What share of my expenses are subscriptions?" | % of total monthly expenses, % of recurring expenses |
| "Is one service type dominating?" | Insights: "AI is 22% of your subscription spending" |

---

## Proposed Domain Model

A `Subscription` is a **classification overlay** on a `RecurringTransaction`. It answers one question the recurring engine cannot: *"Is this recurring a digital subscription, and if so, what type?"*

```
Subscription  ──has-a──▶  RecurringTransaction  ──generates──▶  Transaction  ──has-a──▶  Category
(analytics label)          (schedule + amount)      (ledger atom)     (user grouping)
                                                              ◀──grouped by── Budget
```

The Subscription entity:
- **Does not own recurrence.** Scheduling, generation, idempotency, skip — all stay in `RecurringTransaction`.
- **Does not own financial data.** Amount, frequency, nextDate, description, category — from the linked recurring.
- **Does not own lifecycle.** Active/paused/cancelled state is the recurring's `status`.
- **Owns one thing: classification.** The `serviceType` that enables analytics grouping.

---

## Responsibilities

### Transaction

Unchanged. The immutable ledger atom — optionally linked to the `RecurringTransaction` that generated it. No awareness of subscriptions.

### RecurringTransaction

Unchanged. The single source of truth for recurrence: frequency, interval, anchors, `nextDate`, `status`, amount, type, description, category. Generates `Transactions` via `processDue`. No awareness of subscriptions.

### Subscription

**V1 scope — analytics classification only:**
- Classify a `RecurringTransaction` as a digital subscription.
- Carry the `serviceType` for analytics grouping.
- Enable derived queries: monthly/yearly cost, upcoming renewals, cost by service type, most expensive, share-of-spending.

**Not in V1:** provider, plan, trial, cancellation, price history, notes, website, logos, external integrations.

### Category

Unchanged. User-defined grouping for budgeting. The `serviceType` on `Subscription` is a **separate, analytics-only axis** — the user may file Netflix under "Entertainment" for budgeting while it is "Streaming" for subscription analytics.

### Budget

Unchanged. Reads `Transactions` by `Category` and date range. Subscription spending flows into budgets via the category on generated transactions.

---

## Required Fields

### `id` — UUID PK
Justified by convention. Every Mercury model uses UUID v4 PK stored as CHAR(36).

### `userId` — CHAR(36) FK to User, indexed, NOT NULL
Justified by multi-tenant ownership. Every service scopes queries by userId from `req.user!.id`.

### `recurringTransactionId` — CHAR(36) FK to RecurringTransaction, unique, NOT NULL
Justified as the core relationship — the link to the payment schedule. Amount, frequency, nextDate, status all come from here. Unique constraint: at most one Subscription per RecurringTransaction.

### `serviceType` — ENUM, NOT NULL
Justified as the only field that provides data the recurring engine cannot. Required by "group by service type" and "cost by service type" analytics requirements.

Values: `streaming | ai | cloud | productivity | music | gaming | other`.

### `createdAt` / `updatedAt` / `deletedAt` — TIMESTAMP
Justified by convention: `timestamps: true` + `paranoid: true` on every Mercury model.

### Fields explicitly rejected for V1

| Field | Why rejected |
|---|---|
| `provider` | Recurring's `description` already carries this. Separate field is for management — a non-goal. |
| `plan` / `tier` | Listed as "Future enhancement". No V1 analytics requirement needs it. |
| `website` | Listed as "Future enhancement". |
| `notes` | Listed as "Future enhancement". |
| `trialEndDate` | Explicit non-goal ("Trial management"). |
| `cancellationUrl` | Explicit non-goal ("Cancellation workflows"). |
| `priceHistory` | Not needed for V1 analytics. Would require child collection — unjustified complexity now. |
| `status` | Derived: active = linked recurring.status === 'active' && Subscription not soft-deleted. |
| `amount` / `frequency` / `nextDate` | Already on RecurringTransaction. Duplicating risks inconsistency. |

**Total V1 fields: 4 real fields** + timestamps.

---

## Relationships

### Subscription → RecurringTransaction (many-to-one, unique FK)

- Each Subscription references exactly one RecurringTransaction.
- Each RecurringTransaction may be referenced by at most one Subscription (unique constraint).
- A RecurringTransaction without a Subscription is a generic recurring (rent, salary, gym).

**Cascade on recurring delete:** soft-deleting a RecurringTransaction soft-deletes its linked Subscription (added to `RecurringTransactionsService.delete`).

### Subscription → Transaction (indirect)

No direct FK. Traverse Subscription → RecurringTransaction → Transaction[]. The existing `Transaction.recurringTransactionId` link is sufficient.

### Subscription → Category (indirect)

No direct FK. The linked RecurringTransaction's `categoryId` flows to generated Transactions and into Budgets.

### Subscription → Budget (no relationship)

Budget reads Transactions by Category — unchanged. No new integration needed.

---

## Analytics Computations

All analytics are derived queries — no precomputed or stored aggregates.

### Normalize recurring amount to monthly

| Frequency | Formula |
|---|---|
| monthly | `amount / interval` |
| yearly | `amount / interval / 12` |
| weekly | `amount × 52 / interval / 12` |
| daily | `amount × 365 / interval / 12` |

### Key metrics

- **Monthly subscription cost**: sum normalized monthly over active subscriptions.
- **Yearly subscription cost**: sum normalized yearly over active subscriptions.
- **Active subscription count**: count Subscriptions (not soft-deleted) where linked recurring.status = 'active'.
- **Upcoming renewals**: query linked recurrings where `nextDate` ∈ [from, to], status = 'active'.
- **Cost by service type**: group active subscriptions by `serviceType`, sum normalized monthly per group.
- **Most expensive**: sort by normalized monthly descending.
- **% of total monthly expenses**: `subscriptionMonthlyTotal / totalExpenses` (same `Transaction.sum` pattern as `BudgetsService.getStats`).
- **% of recurring expenses**: `subscriptionMonthlyTotal / allRecurringMonthlyTotal`.

---

## Dashboard Integration

One compact widget alongside `MonthlySummary`:

```
┌─────────────────────────────────┐
│ Subscriptions                   │
│ €92/month · 4 active            │
│ Next: Netflix in 5 days         │
│                       View →    │
└─────────────────────────────────┘
```

Data source: new `getSubscriptionSummary(userId)` method. Called after `RecurringSyncProvider` ready-gate.

---

## Future Evolution

Every future enhancement is additive (nullable columns or child tables on Subscription). RecurringTransaction is never touched.

| Enhancement | Extension |
|---|---|
| Provider name | Add nullable `provider` column |
| Plan / tier | Add nullable `plan` column |
| Website / billing URL | Add nullable `website` column |
| Notes | Add nullable `notes` TEXT column |
| Provider logo | Add nullable `logoUrl` or derive from provider |
| Price-change history | Child collection: `SubscriptionPriceChange` |
| Cancellation tracking | Add `cancelledAt`, `cancellationUrl` to Subscription |
| Trial management | Add `trialEndDate` + lifecycle state |
| Custom service types | Extract enum to `ServiceType` entity |

---

## Risks

- **Orphaned subscriptions on recurring delete**: mitigated by cascade soft-delete in `RecurringTransactionsService.delete`.
- **Service type taxonomy too rigid**: `other` is the catch-all; adding types is a trivial enum change + `sync({ alter: true })`.
- **Normalization inaccuracy**: standard approximation (52/12 for weekly, 365/12 for daily). Yearly figure is exact. Acceptable for V1.
- **Scope creep toward management**: the model supports it without refactor; product decision, not architecture risk.

---

## Final Recommendation

**Adopt the minimal Subscription entity: `{ id, userId, recurringTransactionId, serviceType, timestamps }` as an analytics classification overlay on `RecurringTransaction`.**

This is the smallest architecture that supports the feature well. Four real fields. One relationship. No new generation logic. No budget re-integration. Clean evolution path for future management features.
