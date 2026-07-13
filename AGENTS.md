# AGENTS.md

Mercury — personal finance tracker. TypeScript monorepo (Turbo + npm workspaces): Express + Sequelize/MySQL API, React 19 + Vite web, and shared types. **Node 22, npm 11.**

## Commands

Run from repo root unless noted.

- `npm run build` / `dev` / `test` / `typecheck` → `turbo run <task>` across all packages.
- **CI runs `typecheck → test → build`** in that order. `turbo test` depends on `build`, so deps build first.
- Single package: `cd apps/api && npm run <task>` (or `apps/web`, `packages/shared`).
- Single test: from inside the package, `npx jest __tests__/transactions.routes.spec.ts` or `npx jest -t "test name"`.
- Dev servers: `cd apps/api && npm run dev` (tsx watch, :3001) · `cd apps/web && npm run dev` (Vite, :3000).
- Full stack: `docker compose up -d` (MySQL + API + Web). **Copy `.env.example` → `.env` first** (compose reads env vars from it).

## Monorepo layout

- `apps/api` (`@mercury/api`) — Express backend. Entry `src/index.ts`, app `src/app.ts`.
- `apps/web` (`@mercury/web`) — React + Vite. Entry `src/main.tsx`.
- `packages/shared` (`@mercury/shared`) — **shared TypeScript types only**, re-exported from `src/index.ts`. Consumed from source: tsconfig + jest map `@mercury/shared` → `packages/shared/src`, so no build is needed to use or test it.
- `design-system/mercury/` — **docs, not a package.** `MASTER.md` + `pages/<page>.md` design rules; read before building UI. Page files override MASTER.md for that page.

## Backend (apps/api)

**Structure is flat, grouped by layer — NOT per-resource folders:**
```
src/routes/     *.routes.ts      src/services/   *.service.ts
src/schemas/    *.schema.ts      src/models/      *.model.ts
src/middleware/  auth / error / validation       src/config/  database.ts, env.ts, logger.ts
```
> The `backend-module` skill shows a per-resource folder layout (`src/<name>/*.routes.ts`). That is the **ideal**, not the current code. Follow the existing flat pattern unless told otherwise.

`app.ts` mounts `/health`, `/auth`, then `/api/v1/{users,transactions,categories,budgets,recurring-transactions}`. Routes apply `authenticate` + `validate(zodSchema)` and delegate to a service; services own model access and ownership checks.

Conventions an agent would otherwise guess wrong:
- Every response is the `ApiResponse<T>` envelope from `@mercury/shared`: `{ success, data }` / `{ success, error }`. Never return unwrapped data.
- Auth = **JWT in an HTTP cookie** (`req.cookies.token`), verified by the `authenticate` middleware which sets `req.user = { id, email }`. Extract the user from `req.user`, never `req.params`/`req.query`. Google OAuth registers only when `GOOGLE_CLIENT_ID`/`SECRET` are set.
- Sequelize models: UUID v4 PK stored as `CHAR(36)`, `paranoid: true` (soft delete), `timestamps: true`, snake_case plural table names, `userId` always indexed. Business errors throw `NotFoundError`/`ForbiddenError` → handled by `error.middleware.ts`.
- **Schema sync: `sequelize.sync({ alter: true })` runs on API startup in development only** (`src/index.ts`). There are **no migrations yet** — editing a model auto-alters the dev DB on next `npm run dev`. Migrations are deferred to pre-production; do not add them without coordinating.
- Env is Zod-validated in `src/config/env.ts`; `JWT_SECRET` is required in production (falls back to `dev-secret` in dev).

## Frontend (apps/web)

- All HTTP goes through `src/lib/api.ts` (`api.get/post/patch/delete`); it sends `credentials: 'include'` and prefixes `/api/v1`. **Never use `fetch`/`axios` directly** in hooks/components. Domain types come from `@mercury/shared`, never redefined locally.
- Path alias `@` → `src/` (Vite + jest). **CSS Modules only** (`.module.css` co-located), no inline styles. `process.env.VITE_API_URL` is `define`d at build time.
- Vite dev proxies `/api` and `/auth` to the API (`VITE_API_URL`, default `:3001`).
- Logic lives in `src/hooks/` (`useTransactions`, `useCategories`, `useBudgets`, `useRecurringTransactions`, `useUser`); components in `src/components/` are dumb (props in, callbacks out). Authed pages live under `src/pages/tools/` and render through `ToolsLayout.tsx`.
- **RecurringSyncProvider ready gate**: on mount it calls `POST /api/v1/recurring-transactions/process-due` and exposes `{ ready }`. Dashboard/Transactions/Recurring pages gate their data fetching on `ready` to avoid stale first renders (React runs child effects before parent effects). See `README.md` for the full recurring-transaction lifecycle before touching recurrence.

## Testing

- **No MySQL required to run the test suite.** Backend route tests use `supertest` against `createApp()` with the **service, `authenticate`, and logger mocked**; service tests mock the Sequelize model.
- Backend: `ts-jest`, `node` env, specs in `apps/api/__tests__/**/*.spec.ts`.
- Frontend: `@swc/jest`, `jsdom`, specs in `apps/web/__tests__/**/*.spec.{ts,tsx}`. `jest.setup.ts` imports `@testing-library/jest-dom`; CSS is mocked via `__mocks__/styleMock.js`; `@/` and `@mercury/shared` map to source.
- Coverage gates (enforced by the QA agent): **backend 80% stmts / 75% branches / 80% funcs**; **frontend 70% stmts / 65% branches / 70% funcs**. Code without tests is rejected by QA.
- `npm test` uses `--passWithNoTests`; a package with no specs won't fail the run.

## OpenCode setup

- Subagents in `.opencode/agents/` (architect, backend, frontend, qa) and skills in `.opencode/skills/`. **Load the relevant skill before working** — they encode the conventions (API contract, auth, model, module, tests, frontend hooks/components/pages, QA review).
- Roles: Architect owns new deps + design docs (`.opencode/tools/<tool>/design.md`) and never writes app code; backend implements models + API + tests; frontend implements after the API is ready and tested; QA reviews read-only and never edits. Agents must not add npm deps or reimplement auth.
- There is no root `opencode.json`; instructions live in this file plus `.opencode/` skills/agents.

## Reference

`README.md` is the authoritative domain reference for **transactions, recurring transactions, the `process-due` generation/idempotency flow, skip/pause/cancel semantics, and budget/category integration**. Read it before touching those areas.
