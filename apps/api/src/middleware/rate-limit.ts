import type { Request } from "express";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "../lib/redis";
import { logger } from "../lib/logger";

// Use authenticated user ID as the rate-limit key when available; fall back to IP.
// This gives each authenticated user their own bucket independent of shared IPs.
function userAwareKey(req: Request): string {
  return req.user?.sub ?? req.ip ?? "anonymous";
}

function makeRedisStore() {
  return new RedisStore({
    sendCommand: async (...args: string[]) => {
      const command = typeof (redis as any).call === "function"
        ? (redis as any).call
        : (redis as any).sendCommand;
      if (!command) throw new TypeError("Redis client does not support call/sendCommand");
      try {
        return await command.apply(redis, args);
      } catch (err) {
        logger.warn("Rate-limit: Redis store error; failing open", {
          error: (err as Error).message,
        });
        throw err;
      }
    },
  });
}

const redisStore = process.env.NODE_ENV === "test" ? undefined : makeRedisStore();

// General API rate limit: 100 req/15 min per key
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: userAwareKey,
  passOnStoreError: true,
  store: redisStore,
});

// Auth endpoints: 10 req/15 min per IP (always IP — pre-authentication)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  passOnStoreError: true,
  store: redisStore,
  message: { error: "Too many login attempts, please try again later" },
});

// Challenge start: 5 req/hour per key
export const challengeStartLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: userAwareKey,
  passOnStoreError: true,
  store: redisStore,
  message: { error: "Too many challenge attempts" },
});

// Upload presign: 20 req/hour per key
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: userAwareKey,
  passOnStoreError: true,
  store: redisStore,
});

// Webhook endpoints: 1000 req/hour (internal-to-internal, always uses Redis)
export const webhookLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args: string[]) => (redis as any).call(...args) }),
});

