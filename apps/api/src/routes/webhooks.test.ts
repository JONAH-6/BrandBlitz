import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import webhooksRouter from "./webhooks";
import { errorHandler } from "../middleware/error";
import { signWebhookPayload } from "../middleware/verify-webhook";

// Mock dependencies
vi.mock("../db/queries/challenges");
vi.mock("../lib/logger");
vi.mock("../lib/redis", () => {
  const seenWebhookIds = new Set<string>();
  return {
    redis: {
      call: vi.fn(),
      set: vi.fn((key: string, value: string, ...args: unknown[]) => {
        if (args.includes("NX")) {
          if (seenWebhookIds.has(key)) return Promise.resolve(null);
          seenWebhookIds.add(key);
          return Promise.resolve("OK");
        }

        return Promise.resolve("OK");
      }),
    },
  };
});
vi.mock("../middleware/rate-limit", () => ({
  webhookLimiter: (_req: any, _res: any, next: any) => next(),
}));

import * as challengeQueries from "../db/queries/challenges";

const app = express();
app.use(express.json({ verify: (req, _res, buf) => { (req as any).rawBody = buf; } }));
app.use("/webhooks", webhooksRouter);
app.use(errorHandler);

const WEBHOOK_SECRET = "test-secret";
process.env.WEBHOOK_SECRET = WEBHOOK_SECRET;

function createWebhookHeaders(body: object, override?: Partial<Record<string, string>>) {
  const payload = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signWebhookPayload(payload, Number(timestamp));
  const defaultId = `test-webhook-id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    "x-webhook-secret": WEBHOOK_SECRET,
    "x-webhook-timestamp": timestamp,
    "x-webhook-signature": `sha256=${signature}`,
    "x-webhook-id": override?.["x-webhook-id"] ?? defaultId,
    ...override,
  };
}

describe("Webhooks API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /webhooks/stellar/deposit", () => {
    it("should 401 if secret is wrong", async () => {
      const res = await request(app)
        .post("/webhooks/stellar/deposit")
        .set({
          ...createWebhookHeaders({ memo: "m1", txHash: "h1", amount: "10" }),
          "x-webhook-secret": "wrong-secret",
        })
        .send({ memo: "m1", txHash: "h1", amount: "10" });

      expect(res.status).toBe(401);
    });

    it("should activate challenge happy path", async () => {
      (challengeQueries.getChallengeByMemo as any).mockResolvedValue({
        id: "c1",
        status: "pending_deposit",
      });

      const res = await request(app)
        .post("/webhooks/stellar/deposit")
        .set(createWebhookHeaders({ memo: "m1", txHash: "h1", amount: "10" }))
        .send({ memo: "m1", txHash: "h1", amount: "10" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("activated");
      expect(challengeQueries.updateChallengeStatus).toHaveBeenCalledWith("c1", "active", {
        depositTx: "h1",
      });
    });

    it("should be idempotent for already processed challenges", async () => {
      (challengeQueries.getChallengeByMemo as any).mockResolvedValue({
        id: "c1",
        status: "active", // already active
      });

      const res = await request(app)
        .post("/webhooks/stellar/deposit")
        .set(createWebhookHeaders({ memo: "m1", txHash: "h1", amount: "10" }))
        .send({ memo: "m1", txHash: "h1", amount: "10" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("already_processed");
      expect(challengeQueries.updateChallengeStatus).not.toHaveBeenCalled();
    });

    it("should 404 for unknown memo", async () => {
      (challengeQueries.getChallengeByMemo as any).mockResolvedValue(null);

      const res = await request(app)
        .post("/webhooks/stellar/deposit")
        .set(createWebhookHeaders({ memo: "unknown", txHash: "h1", amount: "10" }))
        .send({ memo: "unknown", txHash: "h1", amount: "10" });

      expect(res.status).toBe(404);
    });

    it("should 400 for stale timestamp", async () => {
      const body = { memo: "m1", txHash: "h1", amount: "10" };
      const payload = JSON.stringify(body);
      const timestamp = Math.floor(Date.now() / 1000) - 600;
      const signature = signWebhookPayload(payload, timestamp);

      const res = await request(app)
        .post("/webhooks/stellar/deposit")
        .set({
          ...createWebhookHeaders(body),
          "x-webhook-timestamp": timestamp.toString(),
          "x-webhook-signature": `sha256=${signature}`,
        })
        .send(body);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Stale");
    });

    it("should reject duplicate webhook ids with 200 no-op", async () => {
      (challengeQueries.getChallengeByMemo as any).mockResolvedValue({
        id: "c1",
        status: "pending_deposit",
      });

      const headers = createWebhookHeaders({ memo: "m1", txHash: "h1", amount: "10" }, {
        "x-webhook-id": "duplicate-id",
      });

      await request(app).post("/webhooks/stellar/deposit").set(headers).send({ memo: "m1", txHash: "h1", amount: "10" });
      const res = await request(app).post("/webhooks/stellar/deposit").set(headers).send({ memo: "m1", txHash: "h1", amount: "10" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("duplicate");
      expect(challengeQueries.updateChallengeStatus).toHaveBeenCalledTimes(1);
    });

    it("should 400 if fields are missing", async () => {
      const body = { memo: "m1" };
      const res = await request(app)
        .post("/webhooks/stellar/deposit")
        .set(createWebhookHeaders(body))
        .send(body); // missing txHash

      expect(res.status).toBe(400);
    });
  });
});
