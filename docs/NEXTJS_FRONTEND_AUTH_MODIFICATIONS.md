# Next.js Frontend Modifications for Refresh Token + JWT Footprint

This backend now uses:

- Access token (short-lived, default 15 minutes)
- Refresh token (default 1 day) in an HttpOnly cookie
- JWT footprint cookie (`token_fp`) bound to the refresh token

The frontend must be updated so session renewal works correctly and securely.

## 1. Backend Contract Changes

Authentication responses changed:

- `POST /api/auth/signup` returns `{ token, user }`
- `POST /api/auth/signin` returns `{ token, user }`

Refresh flow:

- `POST /api/auth/refresh` returns `{ token }`
- Refresh token and footprint are handled in cookies, not in JS-accessible storage

Logout flow:

- `POST /api/auth/logout` revokes access token (if present) and refresh token, then clears cookies

## 2. HTTP Client Configuration (Important)

Always send cookies in requests.

Example (`fetch`):

```ts
await fetch(`${API_URL}/api/auth/refresh`, {
  method: "POST",
  credentials: "include",
});
```

Example (`axios`):

```ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});
```

Without `credentials: "include"` / `withCredentials: true`, refresh will fail because cookies are not sent.

## 3. Access Token Storage Strategy

Keep access token in memory (React state, context, or store).

- Do not persist access token in localStorage if you can avoid it.
- On full page reload, call `/api/auth/refresh` once to rehydrate access token.

## 4. API Request Interceptor Pattern

Implement one retry on 401:

1. If a request returns 401, call `POST /api/auth/refresh` with credentials.
2. If refresh succeeds, update in-memory access token and retry the original request.
3. If refresh fails, clear client auth state and redirect to sign-in.

Guard against infinite loops by allowing only one refresh attempt per failed request.

## 5. Next.js App Router Integration

Recommended:

- Use a central client-side API wrapper for authenticated calls.
- Keep auth user/token state in a dedicated provider.
- Trigger initial refresh in provider on app bootstrap.

Suggested flow:

1. App starts.
2. Frontend calls `/api/auth/refresh`.
3. If success: token in memory, then call `/api/auth/me`.
4. If fail: keep user unauthenticated.

## 6. Logout Implementation

On logout button click:

1. Call `POST /api/auth/logout` with credentials.
2. Clear in-memory access token and user state.
3. Redirect to sign-in page.

## 7. Security Notes

- Refresh token and footprint are HttpOnly cookies, so frontend JS cannot read them.
- This is expected and required for protection against token theft via XSS.
- If the backend detects a footprint mismatch, it bans that token footprint in Redis and forces re-login.

## 8. CORS and Environment Setup

Ensure frontend origin is allowed by backend `CORS_ORIGIN` and requests include credentials.

In production:

- Use HTTPS
- Keep cookie `secure` behavior enabled
- Align frontend and backend domains/subdomains to support cookie policy cleanly

## 9. Minimal Client Auth Service Example

```ts
export async function refreshAccessToken(): Promise<string | null> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`,
    {
      method: "POST",
      credentials: "include",
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { token: string };
  return data.token;
}
```

Use this in your auth bootstrap and 401-retry flow.
