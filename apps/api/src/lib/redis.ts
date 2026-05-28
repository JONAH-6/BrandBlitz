import { Redis } from "ioredis";
import type { SequenceStore } from "@brandblitz/stellar";
import { logger } from "./logger";
import { config } from "./config";

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
});

export const stellarSequenceStore: SequenceStore = {
  get: async (key) => redis.get(key),
  set: async (key, value) => {
    await redis.set(key, value);
  },
  del: async (key) => {
    await redis.del(key);
  },
  incr: async (key) => redis.incr(key),
  setIfAbsent: async (key, value) => (await redis.set(key, value, "NX")) === "OK",
};

export function emitCounterMetric(
  metric: string,
  value = 1,
  metadata: Record<string, unknown> = {}
): void {
  logger.info("Metric emitted", { metric, value, ...metadata });
}

redis.on("error", (err) => {
  logger.error("Redis connection error", { err: err.message });
});

redis.on("connect", () => {
  logger.info("Redis connected");
});

// Poll Redis INFO stats every 60 s and emit redis_evicted_keys_total so that
// a non-zero value can trigger an alert — silent eviction of BullMQ jobs must
// never go unnoticed (see docs/infrastructure/redis.md).
let _lastEvictedKeys = 0;

export function startRedisEvictionMonitor(intervalMs = 60_000): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      const info = await redis.info("stats");
      const match = info.match(/evicted_keys:(\d+)/);
      if (!match) return;

      const total = parseInt(match[1], 10);
      const delta = total - _lastEvictedKeys;
      _lastEvictedKeys = total;

      if (delta > 0) {
        logger.warn("redis_evicted_keys_total", {
          metric: "redis_evicted_keys_total",
          value: delta,
          total,
        });
      }
    } catch {
      // Non-fatal — connection errors are already logged by the error handler.
    }
  }, intervalMs);
}

export async function connectRedis(): Promise<void> {
  await redis.connect();
}
