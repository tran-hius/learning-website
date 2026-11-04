import { appEnv } from "../config";
import { logger } from "./logger";

/**
 * Redis cache best-effort (TASK-003, S1).
 * - REDIS_URL kết nối được → dùng cache; KHÔNG kết nối được (không có Redis local,
 *   module chưa cài, lỗi mạng) → tự skip, API vẫn hoạt động bình thường.
 * - Mọi thao tác đều try/catch, không bao giờ làm fail request vì cache.
 */

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "EX", ttl: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<unknown>;
  quit(): Promise<unknown>;
};

let client: RedisLike | null = null;
let disabled = false;
let initPromise: Promise<RedisLike | null> | null = null;

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
 * Rate limit best-effort bằng Redis INCR + TTL (TASK-004, P3).
 * - Redis sống: trả count trong cửa sổ `windowSec`; caller quyết định cho qua hay từ chối.
 * - Redis chết / không có: trả `{ allowed: true, remaining: null }` và log warn MỘT lần
 *   (best-effort như toàn bộ cache.ts — rate limit không được phép làm sập API).
 */
export async function hitRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<{ allowed: boolean; remaining: number | null }> {
  try {
    const c = await getClient();
    if (!c) return { allowed: true, remaining: null };
    const count = await c.incr(key);
    if (count === 1) {
      await c.expire(key, windowSec);
    }
    const remaining = Math.max(0, limit - count);
    return { allowed: count <= limit, remaining };
  } catch (err) {
    logger.warn({ err }, "Rate limit check failed — allowing request (best-effort)");
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
