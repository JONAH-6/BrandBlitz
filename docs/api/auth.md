# API Authentication

BrandBlitz supports two parallel authentication mechanisms. Both are accepted simultaneously so clients can migrate gradually.

## Bearer Token (current default)

A short-lived JWT is issued at login and sent as an `Authorization: Bearer <token>` header on every request. The API validates it via the `authenticate` middleware.

## Cookie / Session (httpOnly)

The API enables `cors({ credentials: true })` and is scoped to the specific dashboard origin (`WEB_URL` env var — never a wildcard). The frontend axios client sets `withCredentials: true` so the browser attaches cookies automatically.

This means:
- An `httpOnly` session cookie set by a future `/auth/session` endpoint will travel with every cross-origin request.
- The CORS policy rejects requests from unlisted origins even with credentials.

### Why both?

| Mechanism | Benefit |
|---|---|
| Bearer token | Stateless; easy to use from native apps and CLIs |
| httpOnly cookie | Not accessible to JavaScript; resistant to XSS token theft |

### Required API server config

```
WEB_URL=https://app.brandblitz.io   # must NOT be *
```

The browser will refuse to send credentials to a wildcard origin, so `WEB_URL` must always be a specific origin.
