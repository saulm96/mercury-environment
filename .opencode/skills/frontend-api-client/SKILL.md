---
name: frontend-api-client
description: Mandates all HTTP calls go through the shared API client — never raw fetch in hooks or components, always typed generics
metadata:
  agent: frontend
---
# frontend-api-client

**Agent:** Frontend Agent
**When to activate:** Whenever an API call must be made from the frontend.

---

## Absolute rule

**Every HTTP call goes through `src/lib/api.ts`. Never use `fetch()` directly in hooks or components.**

## The API client (`src/lib/api.ts`)

This file already exists from the initial setup. The Frontend Agent **does not rewrite it**, only uses it.

```typescript
// src/lib/api.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include', // always — required for HTTP-only cookies
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
```

## How to use the client in a hook

```typescript
// ✅ Correct
import { api } from '@/lib/api';
import type { ApiResponse, Expense } from '@mercury/shared';

const response = await api.get<ApiResponse<Expense[]>>('/expenses');
const expense = await api.post<ApiResponse<Expense>>('/expenses', { amount: 50, description: 'Coffee' });

// ❌ Forbidden — direct fetch
const response = await fetch('http://localhost:3001/api/v1/expenses', {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
});
```

## Mandatory typing

- Always specify the generic `<T>` when calling `api.get/post/patch/delete`.
- `T` is always `ApiResponse<DomainType>` using types from `@mercury/shared`.
- Never use `any` as the generic.

## Error handling

- The client throws an `Error` with the backend message if the status is not 2xx.
- Hooks catch that error with `try/catch` and store it in their `error` state.
- Components read the `error` state from the hook and display it in the UI.
- **Never** use `.catch(console.error)` and ignore the error.

## `credentials: 'include'`

This option is **mandatory** on all requests. Without it, the browser does not send the HTTP-only cookie with the JWT and all authenticated requests fail with 401.
