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
