/**
 * Các hàm auth chạy trong Server Component (import `next/headers` — KHÔNG
 * import file này từ "use client", tách riêng để client bundle sạch).
 */
import { headers as nextHeaders } from "next/headers";
import { apiFetchServer } from "./client";
import type { MeResponse } from "./types";

/** A7 — GET /auth/me, forward cookie phiên từ request của browser. */
export async function getMeServer(): Promise<MeResponse> {
  const cookie = (await nextHeaders()).get("cookie") ?? "";
  return apiFetchServer<MeResponse>("/auth/me", {
    headers: cookie ? { cookie } : undefined,
  });
}
