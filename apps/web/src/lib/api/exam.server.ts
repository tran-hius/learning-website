/**
 * Exam fetch chạy trong Server Component (forward cookie phiên — pattern
 * content.server.ts). Trả null khi API lỗi → trang rơi demo/trạng thái trống,
 * KHÔNG tự bịa dữ liệu.
 */
import { headers as nextHeaders } from "next/headers";
import { apiFetchServer } from "./client";
import type { ExamHistoryItem } from "./types";

async function cookieHeader(): Promise<Record<string, string> | undefined> {
  const cookie = (await nextHeaders()).get("cookie") ?? "";
  return cookie ? { cookie } : undefined;
}

/** E5 — GET /exams/history (backend trả `{ items }`, không phân trang). */
export async function getExamHistoryServer(): Promise<ExamHistoryItem[] | null> {
  try {
    const data = await apiFetchServer<{ items: ExamHistoryItem[] }>("/exams/history", {
      headers: await cookieHeader(),
    });
    return data.items;
  } catch {
    return null;
  }
}
