---
description: Initial project setup — scaffolds the full monorepo with Docker, Express API, Next.js frontend, and authentication scaffolding
agent: build
---
# Mercury environment – Initial Repository Setup Prompt

## Context

You are setting up the foundational scaffolding for a personal SaaS platform called **Mercury environment**.

Mercury is a modular personal ecosystem where the owner can add tools to solve day-to-day problems. The first tools planned are:

* Personal finance tracking (income and expenses)
* Calendar visualization of transactions
* Task management

Additional tools will be added incrementally in the future.

Your responsibility at this stage is **strictly limited to repository setup and project scaffolding**.

You must create the infrastructure, configuration, folder structure, boilerplate, and wiring necessary to start development.

### Critical Scope Restriction

Do **not** implement business logic.

Do **not** implement domain functionality.

Do **not** create application features beyond what is explicitly requested in this document.

Do **not** make assumptions about future requirements.

If something is not explicitly requested, do not build it.

The goal is a repository that compiles, starts successfully, and is ready for future development.

---

## Tech Stack

| Layer             | Technology                                  |
| ----------------- | ------------------------------------------- |
| Language          | TypeScript (strict mode)                    |
| Frontend          | Next.js (App Router, latest stable version) |
| Backend           | Express                                     |
| Validation        | Zod                                         |
| ORM               | Sequelize                                   |
| Database          | MySQL 8                                     |
| Authentication    | OAuth 2.0 (Google) via Passport             |
| Session Storage   | JWT stored in HTTP-only cookies             |
| Testing           | Jest                                        |
| Containers        | Docker                                      |
| Repository Layout | Monorepo (npm workspaces + turborepo)       |

---

## Repository Structure

Create exactly the following structure:

```text
mercury-environment/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   └── shared/
├── docker/
│   ├── web/
│   │   └── Dockerfile
│   └── api/
│       └── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── tsconfig.base.json
├── turbo.json
└── package.json
```

Do not deviate from this structure.

Do not introduce additional top-level directories.

---

## 1. Monorepo Setup

Use **npm workspaces** with **turborepo**.

Root `package.json` must define:

```json
{
  "name": "mercury-environment",
  "version": "0.0.1",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.5.0",
    "typescript": "^5.7.0"
  },
  "packageManager": "npm@11.0.0"
}
```

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**/*.ts", "src/**/*.tsx", "test/**/*.ts", "test/**/*.tsx", "**/*.test.*", "**/*.spec.*"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

Create a root `tsconfig.base.json` containing:

* strict: true
* esModuleInterop: true
* skipLibCheck: true

Each package and application must extend this base configuration.

---

## 2. Backend – apps/api

Bootstrap an Express application.

### Route Groups to Scaffold

Create the following route groups only:

* Health routes
* Auth routes
* Users routes
* Transactions routes

Route groups may remain minimal and mostly empty as long as the application compiles.

### Express App Structure

```
apps/api/
  src/
    index.ts                    ← Express app entry point
    app.ts                      ← Express app configuration
    routes/
      health.routes.ts
      auth.routes.ts
      users.routes.ts
      transactions.routes.ts
    services/
      auth.service.ts
      users.service.ts
      transactions.service.ts
    middleware/
      auth.middleware.ts        ← authenticates JWT from cookie, sets req.user
      validation.middleware.ts  ← validates request bodies with Zod schemas
      error.middleware.ts       ← global error handler (NotFoundError, ForbiddenError, etc.)
    models/
      user.model.ts             ← Sequelize model
      transaction.model.ts      ← Sequelize model
    schemas/
      user.schema.ts            ← Zod schemas for request validation
      transaction.schema.ts     ← Zod schemas for request validation
    config/
      database.ts               ← Sequelize configuration
  __tests__/
  tsconfig.json
  package.json
```

### Health Endpoint

Implement:

```http
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

No additional endpoints are required.

---

### Authentication

Configure:

* passport
* passport-google-oauth20

Implement the authentication scaffolding required for:

* Google OAuth 2.0
* PKCE flow
* JWT issuance
* Cookie-based authentication

On successful login:

* issue a signed JWT
* store JWT in an HTTP-only cookie
* Secure=true
* SameSite=Strict
* **Redirect the browser to `FRONTEND_URL/transactions`**

Never:

* return JWT in the response body
* store JWT in localStorage
* store JWT in sessionStorage

Create an `authenticate` middleware in `middleware/auth.middleware.ts` that:

1. Reads the JWT from the HTTP-only cookie
2. Verifies the token
3. Attaches the decoded user to `req.user`
4. Returns 401 if the token is invalid or missing

```

### Users Entity

Create a Sequelize model with:

```text
id          CHAR(36) PRIMARY KEY (UUID v4)
email       VARCHAR(255) UNIQUE NOT NULL
name        VARCHAR(255)
provider    VARCHAR(50)
providerId  VARCHAR(255)
createdAt   DATETIME
updatedAt   DATETIME
```

No additional user fields.

No business logic.

No profile features.

---

### Transactions Entity

Create a Sequelize model with:

```text
id          CHAR(36) PRIMARY KEY (UUID v4)
userId      CHAR(36) NOT NULL (FK → users)
type        ENUM('income', 'expense') NOT NULL
amount      DECIMAL(10, 2) NOT NULL
description VARCHAR(255) NOT NULL
date        DATEONLY NOT NULL
category    VARCHAR(100)
createdAt   DATETIME
updatedAt   DATETIME
```

Foreign key indexes:

* `user_id` index (all queries filter by user)
* `date` index (transactions are listed/grouped by date)

No additional transaction fields.

No business logic beyond the model definition.

No aggregation, filtering, or reporting logic.

---

### Database

Configure Sequelize using environment variables.

Requirements:

* MySQL dialect
* Use `sync: { alter: true }` during development to automatically sync models to the database
* Migrations will be introduced before production deployment

---

### Testing

Configure Jest.

Use:

```text
*.spec.ts
```

Use `supertest` for integration tests against the Express app.

Create a smoke test for the Health route.

No additional tests are required.

---

### Environment Variables

Document every required variable inside `.env.example`.

```env
# API
PORT=3001
NODE_ENV=development

# Database (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mercury
DB_USER=mercury
DB_PASSWORD=
DB_ROOT_PASSWORD=

# Auth
JWT_SECRET=
JWT_EXPIRES_IN=7d

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# Frontend
FRONTEND_URL=http://localhost:3000
```

---

## 3. Frontend – apps/web

Bootstrap a Next.js application using:

* App Router
* TypeScript
* strict mode
* Tailwind CSS
* src directory layout

Create:

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── (tools)/
│       └── transactions/
│           ├── page.tsx
│           ├── loading.tsx
│           └── error.tsx
├── components/
│   └── ui/
├── lib/
│   └── api.ts
└── types/
    └── index.ts
```

---

### Landing Page (`/`)

The root page at `/` serves as the landing page. It must contain:

* A **"Sign in with Google"** button
* The button initiates the OAuth flow by navigating to `/auth/google` via a standard `<a>` tag or `window.location`

No additional content is required beyond the button.

No client-side OAuth implementation.

No SDK-based authentication.

No token handling in the frontend.

No separate login page exists — the landing page is the entry point.

---

### Transactions Page (`/transactions`)

Create a placeholder page at `/transactions`:

* Route: `src/app/(tools)/transactions/page.tsx`
* Minimal content — may render a heading like "Transactions" or remain empty
* Include `loading.tsx` and `error.tsx` files following Next.js conventions
* This page is the target of the post-login redirect
* No business logic, no data fetching at this stage

---

### API Access

Create a typed fetch wrapper in:

```text
src/lib/api.ts
```

Configure:

```text
/api/*
```

proxying through Next.js during development.

Frontend code should use relative API paths.

Avoid direct browser requests to backend origins.

---

### Testing

Configure:

* Jest
* React Testing Library

Create one smoke test that verifies the landing page renders with the Sign in button.

---

## 4. Shared Package – packages/shared

Create:

```json
{
  "name": "@mercury/shared"
}
```

Export:

### User

```ts
interface User
```

matching the database model.

### Transaction

```ts
interface Transaction
```

matching the database model.

### ApiResponse

```ts
type ApiResponse<T>
```

generic wrapper.

No additional utilities.

No helper libraries.

---

## 5. Docker

### docker/api/Dockerfile

Create a multi-stage build:

#### base

* Node LTS Alpine

#### development

* install dependencies
* run:

```bash
npx tsx watch src/index.ts
```

#### build

Compile TypeScript with `tsc`.

#### production

Copy:

* dist
* production dependencies

Run compiled application.

---

### docker/web/Dockerfile

Create a multi-stage build.

#### base

Node LTS Alpine.

#### development

```bash
next dev
```

#### build

```bash
next build
```

#### production

Use standalone Next.js output.

---

### docker-compose.yml

Development setup.

Services:

* mysql
* api
* web

Requirements:

#### mysql

* MySQL 8
* named volume
* healthcheck

#### api

* development target
* source mounted
* depends_on healthy mysql

#### web

* development target
* source mounted
* depends_on api

---

### docker-compose.prod.yml

Production override.

Requirements:

* production build targets
* no source mounts
* restart: unless-stopped on all services

---

## Explicitly Forbidden

Do not implement:

### Domain Features

* finance tracking
* expenses
* income management
* calendar functionality
* task management
* dashboards
* reporting
* analytics

### Additional Backend Features

* extra entities beyond User and Transaction
* extra routes beyond health, auth, users, and transactions
* extra services beyond auth, users, and transactions

### Additional Frontend Features

* placeholder pages
* dashboards
* navigation systems
* UI frameworks

### Additional Tooling

Do not add:

* ESLint
* Prettier
* Husky
* Commitlint
* GitHub Actions
* CI/CD pipelines
* Monitoring
* Logging frameworks
* Observability platforms

unless explicitly required for successful compilation.

### Database

Do not:

* seed data
* create sample records
* create additional tables beyond `users` and `transactions`

---

## Acceptance Criteria

The setup is complete only when all conditions are met:

### Infrastructure

```bash
docker-compose up
```

starts:

* mysql
* api
* web

without errors.

### Health Check

```http
GET http://localhost:3001/health
```

returns:

```json
{
  "status": "ok"
}
```

### Frontend

```http
GET http://localhost:3000
```

renders the landing page with a "Sign in with Google" button.

### Authentication

Clicking:

```text
Sign in with Google
```

starts the Google OAuth flow when valid credentials are configured.

On successful authentication, the browser is redirected to `/transactions` and the JWT is stored in an HTTP-only cookie.

### Testing

All Jest tests pass.

### TypeScript

The following succeeds without errors:

```bash
tsc --noEmit
```

across the entire monorepo.

### Final Constraint

Once all acceptance criteria are satisfied, stop.

Do not continue improving the project.

Do not add enhancements.

Do not add optional features.

Do not add future-proofing abstractions.

Do not make architectural decisions beyond the requirements described in this document.
