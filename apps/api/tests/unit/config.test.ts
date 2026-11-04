import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Env guard (TASK-002 — điều kiện 1 của final-reviewer):
 * - production thiếu DATABASE_URL/REDIS_URL/AUTH_SECRET → throw lúc startup.
 * - production AUTH_SECRET còn giá trị dev → throw.
 * - development/test được phép dùng default.
 */
describe("config env guard", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("throws at startup when production misses required env vars", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("REDIS_URL", "");
    vi.stubEnv("AUTH_SECRET", "");

    await expect(import("@/config/app")).rejects.toThrow(/DATABASE_URL.*REDIS_URL|AUTH_SECRET/s);
  });

  it("throws when production AUTH_SECRET is still the dev default", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "mysql://prod-db");
    vi.stubEnv("REDIS_URL", "redis://prod-redis");
    vi.stubEnv("AUTH_SECRET", "dev-only-secret-key-please-rotate");

    await expect(import("@/config/app")).rejects.toThrow(/dev default/);
  });

  it("allows dev defaults outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    delete process.env.AUTH_SECRET;

    const mod = await import("@/config/app");
    expect(mod.isProdEnv).toBe(false);
    expect(mod.appEnv.AUTH_SECRET.length).toBeGreaterThan(0);
    expect(mod.appEnv.DATABASE_URL.length).toBeGreaterThan(0);
  });
});
