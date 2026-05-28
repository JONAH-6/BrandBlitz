import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateReactionTime, validateDeviceFingerprint, BOT_REACTION_THRESHOLD_MS, MIN_HUMAN_REACTION_MS } from "./anti-cheat";
import * as fraudQueries from "../db/queries/fraud-flags";
import { metrics } from "../lib/metrics";

vi.mock("../db/queries/fraud-flags");
vi.mock("../db/queries/sessions");
vi.mock("../lib/redis", () => ({
  redis: {
    sadd: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    scard: vi.fn().mockResolvedValue(1),
    get: vi.fn(),
    set: vi.fn(),
  },
}));
vi.mock("../lib/metrics", () => ({
  metrics: { inc: vi.fn() }
}));
vi.mock("../lib/fingerprint", () => ({
  computeFingerprint: vi.fn().mockReturnValue("test-fingerprint-hash"),
}));

import { redis } from "../lib/redis";
import { computeFingerprint } from "../lib/fingerprint";

describe("anti-cheat middleware", () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = {
      body: {},
      user: { sub: "user-1" },
      params: { challengeId: "challenge-1" },
      headers: {
        "x-device-id": "device-abc",
      },
      ip: "1.2.3.4",
      sessionId: "session-1"
    };
    res = {};
    next = vi.fn();
    vi.clearAllMocks();
    (computeFingerprint as any).mockReturnValue("test-fingerprint-hash");
    (redis.sadd as any).mockResolvedValue(1);
    (redis.expire as any).mockResolvedValue(1);
    (redis.scard as any).mockResolvedValue(1);
  });

  describe("validateReactionTime", () => {
    it("blocks with 403 if reaction time is below bot threshold", async () => {
      req.body.reactionTimeMs = BOT_REACTION_THRESHOLD_MS - 1;

      await expect(validateReactionTime(req, res, next)).rejects.toMatchObject({
        statusCode: 403,
        code: "REACTION_IMPOSSIBLE"
      });

      expect(fraudQueries.createFraudFlag).toHaveBeenCalled();
      expect(metrics.inc).toHaveBeenCalledWith("antiCheat.flags_total", expect.objectContaining({ severity: "critical" }));
    });

    it("flags but allows if reaction time is between bot and human minimum", async () => {
      req.body.reactionTimeMs = MIN_HUMAN_REACTION_MS - 10;

      await validateReactionTime(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(fraudQueries.createFraudFlag).toHaveBeenCalled();
      expect(metrics.inc).toHaveBeenCalledWith("antiCheat.flags_total", expect.objectContaining({ severity: "warning" }));
    });

    it("flags with info severity if reaction time is above maximum", async () => {
      req.body.reactionTimeMs = 35000;

      await validateReactionTime(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(fraudQueries.createFraudFlag).toHaveBeenCalled();
      expect(metrics.inc).toHaveBeenCalledWith("antiCheat.flags_total", expect.objectContaining({ severity: "info" }));
    });
  });

  describe("validateDeviceFingerprint", () => {
    it("rejects with 400 when neither x-device-id nor x-visitor-id is provided", async () => {
      req.headers = {};

      await expect(validateDeviceFingerprint(req, res, next)).rejects.toMatchObject({
        statusCode: 400,
        code: "MISSING_DEVICE_ID",
      });
    });

    it("passes and calls next when fingerprint has <3 accounts", async () => {
      (redis.scard as any).mockResolvedValue(2);

      await validateDeviceFingerprint(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(metrics.inc).not.toHaveBeenCalledWith("antiCheat.fingerprint_collision_total", expect.anything());
    });

    it("rejects with 403 FINGERPRINT_COLLISION when fingerprint has >=3 accounts", async () => {
      (redis.scard as any).mockResolvedValue(3);

      await expect(validateDeviceFingerprint(req, res, next)).rejects.toMatchObject({
        statusCode: 403,
        code: "FINGERPRINT_COLLISION",
      });

      expect(metrics.inc).toHaveBeenCalledWith(
        "antiCheat.fingerprint_collision_total",
        expect.objectContaining({ fingerprint: expect.any(String) })
      );
    });

    it("combines x-visitor-id and x-device-id in the fingerprint", async () => {
      req.headers["x-visitor-id"] = "fp-visitor-id";
      (redis.scard as any).mockResolvedValue(1);

      await validateDeviceFingerprint(req, res, next);

      expect(computeFingerprint).toHaveBeenCalledWith(
        expect.objectContaining({
          visitorId: "fp-visitor-id",
          deviceId: "device-abc",
        })
      );
    });

    it("calls next without checking Redis when there is no authenticated user", async () => {
      req.user = undefined;

      await validateDeviceFingerprint(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(redis.sadd).not.toHaveBeenCalled();
    });

    it("fails open when Redis is unavailable", async () => {
      (redis.sadd as any).mockRejectedValue(new Error("Redis down"));

      await validateDeviceFingerprint(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
