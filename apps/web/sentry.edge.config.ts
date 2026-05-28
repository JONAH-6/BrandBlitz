/**
 * Sentry Edge runtime configuration for Next.js middleware.
 *
 * The Edge runtime has a restricted API surface — only a subset of Node.js
 * APIs are available.  Keep this file minimal.
 *
 * Activation:  set SENTRY_DSN in the environment (same var as server config).
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  enabled: Boolean(process.env.SENTRY_DSN),

  environment: process.env.NODE_ENV,

  // Disable performance tracing in edge — tracing SDK helpers may not be
  // available in all edge runtimes.
  tracesSampleRate: 0,
});
