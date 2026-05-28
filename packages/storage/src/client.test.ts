import { describe, it, expect, beforeEach, vi } from "vitest";
import { getPublicUrl, BUCKETS } from "./client";

describe("storage client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  describe("BUCKETS", () => {
    it("has required bucket constants", () => {
      expect(BUCKETS.BRAND_ASSETS).toBeDefined();
      expect(BUCKETS.SHARE_CARDS).toBeDefined();
    });

    it("uses environment variables for bucket names if provided", async () => {
      process.env.S3_BUCKET_BRAND_ASSETS = "custom-brand-assets";
      process.env.S3_BUCKET_SHARE_CARDS = "custom-share-cards";
      
      // We need to re-import because BUCKETS is a constant evaluated at load time
      const { BUCKETS: customBuckets } = await import("./client");
      expect(customBuckets.BRAND_ASSETS).toBe("custom-brand-assets");
      expect(customBuckets.SHARE_CARDS).toBe("custom-share-cards");
    });
  });

  describe("getPublicUrl", () => {
    it("returns correctly formatted URL using S3_PUBLIC_URL", () => {
      process.env.S3_PUBLIC_URL = "https://cdn.example.com";
      expect(getPublicUrl("my-bucket", "path/to/image.webp")).toBe(
        "https://cdn.example.com/my-bucket/path/to/image.webp"
      );
    });

    it("falls back to S3_ENDPOINT if S3_PUBLIC_URL is missing", () => {
      process.env.S3_PUBLIC_URL = "";
      process.env.S3_ENDPOINT = "https://s3.example.com";
      expect(getPublicUrl("my-bucket", "image.webp")).toBe(
        "https://s3.example.com/my-bucket/image.webp"
      );
    });

    it("falls back to empty string if both are missing", () => {
      process.env.S3_PUBLIC_URL = "";
      process.env.S3_ENDPOINT = "";
      expect(getPublicUrl("my-bucket", "image.webp")).toBe(
        "/my-bucket/image.webp"
      );
    });
  });
});
