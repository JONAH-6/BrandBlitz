/**
 * Sentry server-side (Node.js runtime) configuration for Next.js.
 *
 * Loaded automatically by @sentry/nextjs for Next.js Server Components,
 * Route Handlers, and Server Actions.
 *
 * Activation:  set SENTRY_DSN in the server environment.
 * SENTRY_DSN is distinct from NEXT_PUBLIC_SENTRY_DSN — it is never sent to
 * the browser bundle.
 */

import * as Sentry from "@sentry/nextjs";

const SCRUBBED_BODY_KEYS = new Set([
  "password",
  "token",
  "otp",
  "pin",
  "privateKey",
  "secret",
  "accessToken",
  "refreshToken",
]);

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  enabled: Boolean(process.env.SENTRY_DSN),

  environment: process.env.NODE_ENV,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

  beforeSend(event) {
    if (event.request?.data && typeof event.request.data === "object") {
      const data = event.request.data as Record<string, unknown>;
      for (const [k] of Object.entries(data)) {
        if (SCRUBBED_BODY_KEYS.has(k)) data[k] = "[Filtered]";
      }
    }
    if (event.request?.headers) {
      const headers = event.request.headers as Record<string, string>;
      for (const h of ["authorization", "cookie", "set-cookie"]) {
        if (h in headers) headers[h] = "[Filtered]";
      }
    }
    return event;
  },
});
