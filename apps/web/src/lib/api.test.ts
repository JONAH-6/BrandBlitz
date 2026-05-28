import { describe, it, expect } from "vitest";
import { createApiClient } from "./api";

describe("createApiClient", () => {
  it("sets withCredentials to true so cookies are sent on cross-origin requests", () => {
    const client = createApiClient();
    expect(client.defaults.withCredentials).toBe(true);
  });

  it("sets withCredentials to true even when a bearer token is provided", () => {
    const client = createApiClient("test-token");
    expect(client.defaults.withCredentials).toBe(true);
  });

  it("includes the Authorization header when a token is provided", () => {
    const client = createApiClient("my-jwt");
    expect(client.defaults.headers.Authorization).toBe("Bearer my-jwt");
  });

  it("does not include an Authorization header when no token is provided", () => {
    const client = createApiClient();
    expect(client.defaults.headers.Authorization).toBeUndefined();
  });
});
