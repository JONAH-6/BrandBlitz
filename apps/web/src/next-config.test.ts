import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("next image remote patterns", () => {
  it("only allows explicit avatar, MinIO bucket, and CDN bucket hosts", () => {
    expect(nextConfig.images?.remotePatterns).toMatchInlineSnapshot(`
      [
        {
          "hostname": "lh3.googleusercontent.com",
          "protocol": "https",
        },
        {
          "hostname": "localhost",
          "pathname": "/brandblitz/**",
          "port": "9000",
          "protocol": "http",
        },
        {
          "hostname": "127.0.0.1",
          "pathname": "/brandblitz/**",
          "port": "9000",
          "protocol": "http",
        },
        {
          "hostname": "assets.brandblitz.app",
          "pathname": "/brandblitz/**",
          "protocol": "https",
        },
      ]
    `);
  });
});
