import "dotenv/config";
import { connectDb, closeDb } from "./db";
import { connectRedis, redis } from "./lib/redis";
import { createPayoutWorker } from "./queues/processors/payout.processor";
import { createArchiveWorker, scheduleArchiveJob } from "./queues/archive.queue";
import { logger } from "./lib/logger";

async function startWorker(): Promise<void> {
  await connectDb();
  await connectRedis();

  const payoutWorker = createPayoutWorker();
  const archiveWorker = createArchiveWorker();
  await scheduleArchiveJob();

  logger.info("BullMQ worker started — processing payout and archive jobs");

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — closing worker`);
    await payoutWorker.close();
    await archiveWorker.close();
    await closeDb();
    await redis.disconnect();
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
