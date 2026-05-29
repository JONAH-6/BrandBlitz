import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const mockSend = vi.fn();
const mockGetSignedUrl = vi.fn();
const mockGetPublicUrl = vi.fn((bucket: string, key: string) => `https://public/${bucket}/${key}`);

const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisDel = vi.fn();

vi.mock("../middleware/authenticate", () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { sub: "user-123", email: "test@example.com" };
    return next();
  },
  optionalAuth: (req: any, _res: any, next: any) => {
    req.user = { sub: "user-123", email: "test@example.com" };
    return next();
  },
}));

vi.mock("../middleware/rate-limit", () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  authLimiter: (_req: any, _res: any, next: any) => next(),
  challengeStartLimiter: (_req: any, _res: any, next: any) => next(),
  uploadLimiter: (_req: any, _res: any, next: any) => next(),
}));

vi.mock("@brandblitz/storage", () => ({
  s3: { send: mockSend },
  BUCKETS: {
    BRAND_ASSETS: "brand-assets",
    SHARE_CARDS: "share-cards",
  },
  getPublicUrl: mockGetPublicUrl,
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock("../lib/redis", () => ({
  redis: {
    get: mockRedisGet,
    set: mockRedisSet,
    del: mockRedisDel,
  },
}));

import { errorHandler } from "../middleware/error";

let app: express.Express;
let registerRoutes: (app: express.Express) => void;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  const routes = await import("../routes");
  registerRoutes = routes.registerRoutes;
  registerRoutes(app);
  app.use(errorHandler);
});

beforeEach(() => {
  vi.resetAllMocks();
  // Default: Redis set/del succeed silently
  mockRedisSet.mockResolvedValue("OK");
  mockRedisDel.mockResolvedValue(1);
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe("upload routes integration", () => {
  it("POST /upload/presign returns signed URL and public URL for valid brand-logo uploads", async () => {
    mockGetSignedUrl.mockResolvedValueOnce("https://signed-url");

    const response = await request(app)
      .post("/upload/presign")
      .send({
        type: "brand-logo",
        contentType: "image/png",
        contentLength: 1024 * 1024,
      })
      .expect(200);

    expect(response.body).toEqual({
      uploadUrl: "https://signed-url",
      key: expect.stringMatching(/^logos\/[\w-]{36}$/),
      publicUrl: expect.stringContaining("https://public/brand-assets/logos/"),
      expiresIn: 60,
    });
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);

    const command = mockGetSignedUrl.mock.calls[0][1];
    expect(command.input).toMatchObject({
      Bucket: "brand-assets",
      ContentType: "image/png",
      Key: response.body.key,
    });

    expect(mockGetPublicUrl).toHaveBeenCalledWith(
      "brand-assets",
      response.body.key
    );

    // Ownership record must be created in Redis
    expect(mockRedisSet).toHaveBeenCalledOnce();
    const [redisKey, , , ttl] = mockRedisSet.mock.calls[0];
    expect(redisKey).toContain(`user-123:${response.body.key}`);
    expect(ttl).toBeGreaterThan(0);
  });

  it("POST /upload/presign rejects disallowed MIME types with 400", async () => {
    const response = await request(app)
      .post("/upload/presign")
      .send({
        type: "brand-logo",
        contentType: "image/gif",
        contentLength: 1024,
      })
      .expect(400);

    expect(response.body.error).toBe("Validation Error");
  });

  it("POST /upload/presign rejects oversize contentLength with 400", async () => {
    const response = await request(app)
      .post("/upload/presign")
      .send({
        type: "brand-logo",
        contentType: "image/png",
        contentLength: 3 * 1024 * 1024,
      })
      .expect(400);

    expect(response.body.error).toBe(
      "Content length exceeds maximum of 2MB for brand-logo"
    );
  });

  it("POST /upload/verify returns 200 when the object exists", async () => {
    mockSend.mockResolvedValueOnce({});

    const response = await request(app)
      .post("/upload/verify")
      .send({ key: "logos/test-key" })
      .expect(200);

    expect(response.body).toEqual({
      exists: true,
      publicUrl: "https://public/brand-assets/logos/test-key",
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0]?.input).toMatchObject({
      Bucket: "brand-assets",
      Key: "logos/test-key",
    });
    // Ownership record must be cleared after successful verify
    expect(mockRedisDel).toHaveBeenCalledOnce();
  });

  it("POST /upload/verify returns 404 when the object does not exist", async () => {
    mockSend.mockRejectedValueOnce(new Error("Not found"));

    const response = await request(app)
      .post("/upload/verify")
      .send({ key: "logos/test-key" })
      .expect(404);

    expect(response.body.error).toBe("File not found in storage");
  });

  it("DELETE /upload/abort deletes the object and returns 204 when caller owns the key", async () => {
    mockRedisGet.mockResolvedValueOnce("1"); // ownership confirmed
    mockSend.mockResolvedValueOnce({});

    await request(app)
      .delete("/upload/abort")
      .send({ key: "logos/orphan-key" })
      .expect(204);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0]?.input).toMatchObject({
      Bucket: "brand-assets",
      Key: "logos/orphan-key",
    });
    // Ownership record must be removed after successful delete
    expect(mockRedisDel).toHaveBeenCalledOnce();
  });

  it("DELETE /upload/abort targets the correct bucket for avatars/", async () => {
    mockRedisGet.mockResolvedValueOnce("1");
    mockSend.mockResolvedValueOnce({});

    await request(app)
      .delete("/upload/abort")
      .send({ key: "avatars/orphan-key" })
      .expect(204);

    expect(mockSend.mock.calls[0][0]?.input).toMatchObject({
      Bucket: "brand-assets",
      Key: "avatars/orphan-key",
    });
  });

  it("DELETE /upload/abort returns 403 when the caller did not create the key (IDOR guard)", async () => {
    mockRedisGet.mockResolvedValueOnce(null); // no ownership record

    const response = await request(app)
      .delete("/upload/abort")
      .send({ key: "logos/someone-elses-key" })
      .expect(403);

    expect(response.body.error).toBe("Not authorised to abort this upload");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("DELETE /upload/abort returns 400 when key is missing", async () => {
    const response = await request(app)
      .delete("/upload/abort")
      .send({})
      .expect(400);

    expect(response.body.error).toBe("Validation Error");
  });
});
