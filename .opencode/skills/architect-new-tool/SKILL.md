---
name: architect-new-tool
description: Designs new tools for the Mercury ecosystem — creates design documents and shared types before delegating implementation
metadata:
  agent: architect
---
# architect-new-tool

**Agent:** Architect Agent
**When to activate:** Whenever a new tool is to be added to the Mercury ecosystem.

---

## Mandatory before writing a single line of code

Answer these questions in a design document (`.opencode/tools/<tool-name>/design.md`) before delegating to the Backend Agent or Frontend Agent:

1. **Name and purpose** — What problem does this tool solve? One sentence.
2. **Data entities** — What new models are needed? Does it reuse any existing model?
3. **Relationships** — How does it relate to `User`? To other tools?
4. **Required endpoints** — List the REST endpoints (method + route + description) before the Backend Agent starts.
5. **Required pages** — List the React Router paths before the Frontend Agent starts.
6. **Shared types** — What new interfaces go into `packages/shared`? Define them here.
7. **Impact on existing code** — Does it touch anything that already works? If yes, document what and why.

## Module structure in the monorepo

Every new tool follows this structure. No deviations allowed:

```
apps/api/src/<name>/
  <name>.routes.ts          ← Express Router, applies middleware
  <name>.service.ts         ← business logic, accesses Sequelize models
  schemas/
    <name>.schema.ts        ← Zod schemas for request validation
  __tests__/
    <name>.service.spec.ts
    <name>.routes.spec.ts

apps/web/src/pages/<name>/
  <Name>Page.tsx
  <Name>Skeleton.tsx
  <Name>Error.tsx
  <Name>Layout.tsx     (optional)

apps/web/src/hooks/<name>/
  use<Name>List.ts
  use<Name>Create.ts
  use<Name>Update.ts
  use<Name>Delete.ts

packages/shared/src/types/<name>.ts
```

## Delegation rules

- The Architect Agent **does not write implementation code**. It only creates the `design.md` and types in `packages/shared`.
- Delegate to the Backend Agent first (models + API). Only when the API is ready and tested, delegate to the Frontend Agent.
- If during implementation a decision not foreseen in the `design.md` arises, the Backend or Frontend Agent **stops** and notifies the Architect Agent before continuing.

## What the Architect Agent never does

- Does not touch `apps/api` or `apps/web` directly.
- Does not change existing Sequelize models without first updating the `design.md`.
- Does not add new npm dependencies without justifying them in the `design.md`.
