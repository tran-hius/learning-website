import { describe, expect, it } from "vitest";
import { rateLimitWith } from "../../src/utils/cache";

/**
 * OC-1 (TASK-006): hitRateLimit phải là FIXED WINDOW thật.
 * Giả lập Redis client với clock điều khiển được — gọi cách quãng để chứng minh:
 * 1) Gọi 10 lần cách 1s trong window 60s → hết hạn đúng giờ (không khóa vĩnh viễn).
 * 2) TTL KHÔNG bị kéo dài khi gọi thêm (khác bản cũ EXPIRE-mỗi-lần).
 * 3) Vượt limit → blocked trong cửa sổ; qua cửa sổ mới → mở lại.
 */

type Entry = { count: number; expiresAtMs: number };

function makeFakeRedis(clock: { now: number }) {
  const store = new Map<string, Entry>();
  const client = {
    async set(key: string, value: string, mode: "EX", ttl: number, nx?: "NX") {
      void mode;
      const existing = store.get(key);
      if (existing && existing.expiresAtMs > clock.now) {
        return nx === "NX" ? null : "OK";
      }
      store.set(key, { count: Number(value), expiresAtMs: clock.now + ttl * 1000 });
      return "OK";
    },
    pipeline() {
      const ops: Array<() => [Error | null, unknown]> = [];
      const pipe = {
        incr(key: string) {
          ops.push(() => {
            const existing = store.get(key);
            const alive = existing && existing.expiresAtMs > clock.now;
            const count = (alive ? existing!.count : 0) + 1;
            store.set(key, {
              count,
              // INCR path KHÔNG đụng TTL (fixed window thật).
              expiresAtMs: alive ? existing!.expiresAtMs : clock.now,
            });
            return [null, count];
          });
          return pipe;
        },
        expire(key: string, ttl: number) {
          ops.push(() => {
            const existing = store.get(key);
            if (existing) existing.expiresAtMs = clock.now + ttl * 1000;
            return [null, 1];
          });
          return pipe;
        },
        async exec() {
          return ops.map((op) => op());
        },
      };
      return pipe;
    },
    inspect(key: string): Entry | undefined {
      return store.get(key);
    },
  };
  return client;
}

describe("rateLimitWith — fixed window thật (OC-1)", () => {
  it("gọi 10 lần CÁCH QUÃNG 1s trong window 60s → luôn allowed, hết hạn đúng 60s", async () => {
    const clock = { now: 1_000_000 };
    const redis = makeFakeRedis(clock);
    const key = "rl:test-spaced";

    for (let t = 0; t < 10; t++) {
      clock.now += 1000; // cách quãng 1s mỗi lần gọi
      const r = await rateLimitWith(redis, key, 10, 60);
      expect(r.allowed).toBe(true);
    }
    // Đúng 60s sau lần gọi đầu (t = 1_001_000): TTL không bị kéo dài bởi các lần gọi sau.
    const entry = redis.inspect(key);
    expect(entry).toBeDefined();
    expect(entry!.expiresAtMs).toBe(1_001_000 + 60_000);
    clock.now = 1_061_001; // window (từ lần gọi đầu 1_001_000) đã hết hạn ở 1_061_000
    const after = await rateLimitWith(redis, key, 10, 60);
    expect(after.allowed).toBe(true);
    expect(after.remaining).toBe(9); // đếm lại từ 1 → cửa sổ mới
  });

  it("vượt limit trong cửa sổ → blocked; qua cửa sổ → allowed lại", async () => {
    const clock = { now: 2_000_000 };
    const redis = makeFakeRedis(clock);
    const key = "rl:test-block";
    for (let i = 0; i < 3; i++) {
      const r = await rateLimitWith(redis, key, 3, 60);
      expect(r.allowed).toBe(true);
    }
    clock.now += 1000;
    const blocked = await rateLimitWith(redis, key, 3, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);

    clock.now += 60_000; // qua cửa sổ
    const fresh = await rateLimitWith(redis, key, 3, 60);
    expect(fresh.allowed).toBe(true);
    expect(fresh.remaining).toBe(2);
  });

  it("lần gọi đầu tiên (SET NX OK) → count = 1, TTL = window", async () => {
    const clock = { now: 3_000_000 };
    const redis = makeFakeRedis(clock);
    const r = await rateLimitWith(redis, "rl:first", 5, 30);
    expect(r).toEqual({ allowed: true, remaining: 4 });
    expect(redis.inspect("rl:first")!.expiresAtMs).toBe(3_000_000 + 30_000);
  });
});
