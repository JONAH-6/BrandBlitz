import type { Job } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PAYOUT_WORKER_CONCURRENCY,
  createPayoutWorker,
  payoutWorkerOptions,
  processPayoutJob,
} from "./payout.processor";
import { payoutJobOptions } from "../payout.queue";

const mocks = vi.hoisted(() => ({
  processPayout: vi.fn(),
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("../../services/payout", () => ({
  processPayout: mocks.processPayout,
}));

vi.mock("../../lib/logger", () => ({
  logger: {
    info: mocks.loggerInfo,
    error: mocks.loggerError,
  },
}));

vi.mock("../../lib/redis", () => ({
  redis: {},
}));

class FakeWorker {
  readonly queueName: string;
  readonly processor: (job: Job<{ challengeId: string }>) => Promise<void>;
  readonly options: typeof payoutWorkerOptions;
  readonly handlers = new Map<string, (...args: unknown[]) => void>();

  constructor(
    queueName: string,
    processor: (job: Job<{ challengeId: string }>) => Promise<void>,
    options: typeof payoutWorkerOptions
  ) {
    this.queueName = queueName;
    this.processor = processor;
    this.options = options;
  }

  on(event: string, handler: (...args: unknown[]) => void): this {
    this.handlers.set(event, handler);
    return this;
  }
}

function makeJob(id: string, challengeId: string, attemptsMade = 0): Job<{ challengeId: string }> {
  return {
    id,
    data: { challengeId },
    attemptsMade,
  } as Job<{ challengeId: string }>;
}

async function runWithRetries(
  processor: (job: Job<{ challengeId: string }>) => Promise<void>,
  job: Job<{ challengeId: string }>,
  attempts: number
): Promise<{ attemptsMade: number; error?: Error }> {
  let attemptsMade = 0;

  while (attemptsMade < attempts) {
    try {
      await processor({ ...job, attemptsMade } as Job<{ challengeId: string }>);
      return { attemptsMade: attemptsMade + 1 };
    } catch (error) {
      attemptsMade += 1;
      if (attemptsMade >= attempts) {
        return { attemptsMade, error: error as Error };
      }
    }
  }

  return { attemptsMade };
}

async function runWithConcurrency(
  processor: (job: Job<{ challengeId: string }>) => Promise<void>,
  jobs: Job<{ challengeId: string }>[],
  concurrency: number
): Promise<{ maxInFlight: number }> {
  let maxInFlight = 0;
  let inFlight = 0;
  const queue = [...jobs];

  async function workerLoop(): Promise<void> {
    while (queue.length > 0) {
      const nextJob = queue.shift();
      if (!nextJob) return;

      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);

      try {
        await processor(nextJob);
      } finally {
        inFlight -= 1;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => workerLoop()));
  return { maxInFlight };
}

describe("payout processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("awaits processPayout with the challengeId from the job", async () => {
    const deferred = Promise.resolve();
    mocks.processPayout.mockReturnValue(deferred);

    await processPayoutJob(makeJob("job-1", "challenge-1"));

    expect(mocks.processPayout).toHaveBeenCalledWith("challenge-1");
    expect(mocks.loggerInfo).toHaveBeenCalledWith("Processing payout job", {
      jobId: "job-1",
      challengeId: "challenge-1",
    });
  });

  it("creates a worker with queue name payout and concurrency 2", () => {
    const worker = createPayoutWorker(FakeWorker as unknown as typeof import("bullmq").Worker);

    expect(worker).toBeInstanceOf(FakeWorker);
    expect((worker as unknown as FakeWorker).queueName).toBe("payout");
    expect((worker as unknown as FakeWorker).options.concurrency).toBe(
      PAYOUT_WORKER_CONCURRENCY
    );
  });

  it("logs completion and failure events from the worker", () => {
    const worker = createPayoutWorker(FakeWorker as unknown as typeof import("bullmq").Worker);
    const fakeWorker = worker as unknown as FakeWorker;

    fakeWorker.handlers.get("completed")?.(makeJob("job-1", "challenge-1"));
    fakeWorker.handlers
      .get("failed")
      ?.(
        makeJob("job-2", "challenge-2", 2),
        new Error("processor failed")
      );

    expect(mocks.loggerInfo).toHaveBeenCalledWith("Payout job completed", { jobId: "job-1" });
    expect(mocks.loggerError).toHaveBeenCalledWith("Payout job failed", {
      jobId: "job-2",
      error: "processor failed",
      attempts: 2,
    });
  });

  it("retries a failing job according to the configured attempts", async () => {
    mocks.processPayout.mockRejectedValue(new Error("boom"));

    const result = await runWithRetries(
      processPayoutJob,
      makeJob("job-1", "challenge-1"),
      payoutJobOptions.attempts ?? 1
    );

    expect(mocks.processPayout).toHaveBeenCalledTimes(3);
    expect(result.attemptsMade).toBe(3);
    expect(result.error?.message).toBe("boom");
  });

  it("limits processing to two jobs in flight at a time", async () => {
    const pendingResolvers: Array<() => void> = [];
    mocks.processPayout.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          pendingResolvers.push(resolve);
        })
    );

    const concurrencyRun = runWithConcurrency(
      processPayoutJob,
      Array.from({ length: 10 }, (_, index) => makeJob(`job-${index}`, `challenge-${index}`)),
      PAYOUT_WORKER_CONCURRENCY
    );

    await Promise.resolve();
    await Promise.resolve();

    const { maxInFlight } = await (async () => {
      while (pendingResolvers.length < PAYOUT_WORKER_CONCURRENCY) {
        await Promise.resolve();
      }

      while (pendingResolvers.length > 0) {
        const resolveNext = pendingResolvers.shift();
        resolveNext?.();
        await Promise.resolve();
      }

      return concurrencyRun;
    })();

    expect(maxInFlight).toBe(2);
  });

  it("exposes queue defaults for retry, backoff, and cleanup policy", () => {
    expect(payoutJobOptions).toEqual({
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    });
    expect(payoutWorkerOptions.concurrency).toBe(2);
  });
});
