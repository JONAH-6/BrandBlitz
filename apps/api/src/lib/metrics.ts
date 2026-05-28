import { logger } from "./logger";

export const metrics = {
  inc(name: string, labels?: Record<string, unknown>): void {
    logger.info("metric", { name, value: 1, ...labels });
  },
};
