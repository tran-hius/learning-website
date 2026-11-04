import { appEnv } from "../config";
import { logger } from "./logger";

/**
 * Redis cache best-effort (TASK-003, S1).
 * - REDIS_URL kết nối được → dùng cache; KHÔNG kết nối được (không có Redis local,
 *   module chưa cài, lỗi mạng) → tự skip, API vẫn hoạt động bình thường.
 * - Mọi thao tác đều try/catch, không bao giờ làm fail request vì cache.
 */

type PipelineLike = {
  incr(key: string): PipelineLike;
  expire(key: string, ttl: number): PipelineLike;
  exec(): Promise<Array<[Error | null, unknown] | null>>;
};

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "EX", ttl: number, nx?: "NX"): Promise<unknown>;
  del(key: string): Promise<unknown>;
  pipeline(): PipelineLike;
  quit(): Promise<unknown>;
};

let client: RedisLike | null = null;
let disabled = false;
let initPromise: Promise<RedisLike | null> | null = null;
/** Warn "Redis chết" MỘT lần duy nhất (flag như init path — BE-1, TASK-005). */
let rateLimitWarned = false;

async function getClient(): Promise<RedisLike | null> {
  if (client) return client;
  if (disabled) return null;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const { default: RedisCtor } = await import("ioredis");
      const c = new RedisCtor(appEnv.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        // Không retry vô hạn — cache chỉ là tối ưu, fail nhanh rồi skip.
        retryStrategy: () => null,
        enableOfflineQueue: false,
      });
      // Nuốt event "error" để không crash process khi Redis vắng mặt.
      c.on("error", () => {});
      await c.connect();
      client = c as unknown as RedisLike;
      logger.info("Redis cache connected");
      return client;
    } catch (err) {
      logger.warn({ err }, "Redis unavailable — cache disabled (best-effort skip)");
      disabled = true;
      return null;
    } finally {
      initPromise = null;
    }
  })();
  return initPromise;
}

/** Trả null nếu cache tắt / miss / lỗi. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const c = await getClient();
    if (!c) return null;
    const raw = await c.get(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

/** No-op an toàn khi cache tắt. */
export async function cacheSet(key: string, value: unknown, ttlSec: number): Promise<void> {
  try {
    const c = await getClient();
    if (!c) return;
    await c.set(key, JSON.stringify(value), "EX", ttlSec);
  } catch {
    // ignore — cache không được phép làm fail business logic.
  }
}

/** Invalidate (dùng khi admin sửa content). */
export async function cacheDel(key: string): Promise<void> {
  try {
    const c = await getClient();
    if (!c) return;
    await c.del(key);
  } catch {
    // ignore
  }
}

/**
 * Rate limit best-effort bằng Redis — FIXED WINDOW thật (OC-1, TASK-006):
 * - `SET key 1 EX window NX` trước: chỉ khi key CHƯA tồn tại (count = 1) mới đặt TTL.
 * - NX thất bại (key đã có) → chỉ INCR, KHÔNG EXPIRE lại → TTL của cửa sổ không bị
 *   kéo dài ⇒ cửa sổ đóng đúng giờ, không khóa vĩnh viễn (đây là fixed-window thật,
 *   khác bản cũ EXPIRE mỗi lần làm cửa sổ trượt vô hạn).
 * - Redis chết / không có: trả `{ allowed: true, remaining: null }`, warn MỘT lần
 *   (flag `rateLimitWarned`) rồi im lặng — không warn mỗi request.
 *
 * Logic lõi tách thành `rateLimitWith(clientLike, ...)` — pure theo client interface
 * để unit test giả lập gọi cách quãng (test/rate-limit.test.ts).
 */
export type RateLimitClientLike = Pick<RedisLike, "set" | "pipeline">;

export async function rateLimitWith(
  c: RateLimitClientLike,
  key: string,
  limit: number,
  windowSec: number,
): Promise<{ allowed: boolean; remaining: number | null }> {
  const setRes = await c.set(key, "1", "EX", windowSec, "NX");
  if (setRes === "OK" || setRes === 1) {
    // Lần đầu trong cửa sổ — TTL đã đặt atomic cùng lúc với count=1.
    return { allowed: limit >= 1, remaining: Math.max(0, limit - 1) };
  }
  // Key đã tồn tại trong cửa sổ → chỉ tăng count, giữ nguyên TTL (fixed window).
  const pipe = c.pipeline();
  pipe.incr(key);
  const results = await pipe.exec();
  const count = typeof results?.[0]?.[1] === "number" ? (results[0][1] as number) : 1;
  const remaining = Math.max(0, limit - count);
  return { allowed: count <= limit, remaining };
}

export async function hitRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<{ allowed: boolean; remaining: number | null }> {
  try {
    const c = await getClient();
    if (!c) return { allowed: true, remaining: null };
    const result = await rateLimitWith(c, key, limit, windowSec);
    rateLimitWarned = false; // Redis sống lại → cho phép warn lần tiếp nếu chết lần nữa
    return result;
  } catch (err) {
    if (!rateLimitWarned) {
      logger.warn({ err }, "Rate limit check failed — allowing request (best-effort)");
      rateLimitWarned = true;
    }
    return { allowed: true, remaining: null };
  }
}

/** Đóng kết nối khi graceful shutdown / test. */
export async function cacheClose(): Promise<void> {
  try {
    await client?.quit();
  } catch {
    // ignore
  } finally {
    client = null;
  }
}
