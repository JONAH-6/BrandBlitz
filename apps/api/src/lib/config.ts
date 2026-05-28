import { z } from "zod";

const configSchema = z.object({
  // Infrastructure
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  // Auth
  JWT_SECRET: z.string().min(32),
  /** Set during rotation: the secret being phased out. Both old + new are accepted
   *  simultaneously for the duration of the access-token TTL (15 min). */
  JWT_SECRET_PREVIOUS: z.string().min(32).optional(),
  /** Separate signing secret for refresh tokens. Falls back to JWT_SECRET. */
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  WEB_URL: z.string().url().default("http://localhost:3000"),

  // Stellar
  STELLAR_NETWORK: z.enum(["testnet", "public"]).default("testnet"),
  HOT_WALLET_SECRET: z.string().min(1),
  HOT_WALLET_PUBLIC_KEY: z.string().min(1),
  WEBHOOK_SECRET: z.string().min(1),

  // S3 / Storage
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("auto"),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET_BRAND_ASSETS: z.string().default("brand-assets"),
  S3_BUCKET_SHARE_CARDS: z.string().default("share-cards"),
  S3_PUBLIC_URL: z.string().url(),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_SERVICE_SID: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "verbose", "debug", "silly"]).default("info"),

  // Error monitoring — absent by default in local dev; set in staging/prod
  SENTRY_DSN: z.string().url().optional(),

  // Session integrity — rotated independently of JWT_SECRET; optional for backwards compat
  SESSION_INTEGRITY_KEY: z.string().min(32).optional(),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((issue) => issue.path.join(".")).join(", ");
      console.error(`❌ Invalid or missing environment variables: ${missingVars}`);
      process.exit(1);
    }
    throw error;
  }
}

export const config = loadConfig();
