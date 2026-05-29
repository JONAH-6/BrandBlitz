import "dotenv/config";
import { initSentry } from "./lib/sentry";
void initSentry();
import { connectDb, closeDb } from "./db";
import { connectRedis, redis, startRedisEvictionMonitor } from "./lib/redis";
import { createPayoutWorker } from "./queues/processors/payout.processor";
import { createLeagueWorker } from "./queues/processors/league.processor";
import { ensureLeagueRepeatableJobs } from "./queues/league.queue";
import { drainSharedAgent } from "@brandblitz/stellar";
import { logger } from "./lib/logger";

async function startWorker(): Promise<void> {
  await connectDb();
  await connectRedis();

  const payoutWorker = createPayoutWorker();
  const leagueWorker = createLeagueWorker();
  await ensureLeagueRepeatableJobs();
  const evictionMonitor = startRedisEvictionMonitor();
  logger.info("BullMQ worker started — processing payout + league jobs");

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — closing worker`);
    clearInterval(evictionMonitor);
    await payoutWorker.close();
    await leagueWorker.close();
    await closeDb();
    await redis.disconnect();
    drainSharedAgent();
    logger.info("Worker shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startWorker().catch((err) => {
  logger.error("Worker failed to start", { err });
  process.exit(1);
});
