/**
 * Sentry browser (client-side) configuration for Next.js.
 *
 * Install:  pnpm add @sentry/nextjs --filter @brandblitz/web
 *
 * This file is loaded automatically by @sentry/nextjs on the client bundle.
 * The DSN must be exposed as a NEXT_PUBLIC_ var so it's available in the browser.
 *
 * Activation:  set NEXT_PUBLIC_SENTRY_DSN in the environment.
 * Off by default in local dev (undefined DSN → Sentry.init is a no-op).
 */

import * as Sentry from "@sentry/nextjs";

// PII: body field names that must never appear in Sentry breadcrumbs / events.
const SCRUBBED_KEYS = ["password", "token", "otp", "pin", "privateKey", "secret"];

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only send events in staging / production
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  environment: process.env.NODE_ENV,

  // Sample 10 % of traces in production; adjust as traffic grows
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

  // Scrub sensitive keys from captured data
  beforeSend(event) {
    if (event.request?.data && typeof event.request.data === "object") {
      const data = event.request.data as Record<string, unknown>;
      for (const key of SCRUBBED_KEYS) {
        if (key in data) data[key] = "[Filtered]";
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
