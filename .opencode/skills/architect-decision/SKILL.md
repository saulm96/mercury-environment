---
name: architect-decision
description: Documents cross-cutting technical decisions as ADRs — new dependencies, pattern changes, or structural refactors
metadata:
  agent: architect
---
# architect-decision

**Agent:** Architect Agent
**When to activate:** When a cross-cutting technical decision must be made (new dependency, pattern change, structural refactor).

---

## Mandatory decision format

Every relevant technical decision is documented in `docs/decisions/<date>-<title>.md` using this format:

```
# ADR-XXX: <title>

## Status
Proposed | Accepted | Deprecated

## Context
What situation or problem led to this decision?

## Options considered
1. Option A — pros / cons
2. Option B — pros / cons

## Decision
Chosen option and why.

## Consequences
What changes? What technical debt does it introduce? What does it enable in the future?
```

## When an ADR is mandatory

- Adding a third-party npm dependency not included in the initial setup.
- Changing the monorepo folder structure.
- Modifying the authentication strategy.
- Changing an existing table schema destructively.
- Introducing a new pattern that other agents must follow.
- Deciding NOT to do something that seemed obvious.

## When an ADR is NOT required

- Adding a new Express route following the established pattern.
- Adding a new page in React following the established pattern.
- Style, naming, or comment changes.
