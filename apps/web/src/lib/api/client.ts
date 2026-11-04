import type { ApiResponse } from "./types";

export const API_BASE = "/api/v1";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

/** Lỗi message tiếng Việt thân thiện hiển thị UI. */
export function friendlyApiMessage(err: unknown): string {
  if (isApiError(err)) {
    switch (err.code) {
      case "AUTH_REQUIRED":
      case "AUTH_INVALID":
        return "Bạn cần đăng nhập để xem phần này nha 🐾";
      case "FORBIDDEN":
        return "Bạn chưa có quyền xem mục này.";
      case "NOT_FOUND":
        return "Không tìm thấy nội dung này, thử mục khác nhé!";
      case "EXAM_STATE_CONFLICT":
        return "Bài thi đã kết thúc hoặc chưa bắt đầu, kiểm tra lại nhé.";
      case "RATE_LIMITED":
        return "Bạn làm nhanh quá, nghỉ tí rồi thử lại nha ☕";
      default:
        return err.message;
    }
  }
  return "Có gì đó sai sai, thử lại sau ít phút nhé!";
}

// ── Auto-refresh placeholder ─────────────────────────────────────────
// Phase 1: access token nằm cookie httpOnly do backend tự gia hạn.
// Sau này thêm refresh-on-401 một lần rồi retry ở đây.

// ── Fetch wrapper ────────────────────────────────────────────────────

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** multipart: truyền FormData, wrapper không set Content-Type */
  formData?: FormData;
  signal?: AbortSignal;
};

/**
 * Gọi 1 endpoint api/v1, bóc khung `{ success, data, error }`.
 * Trả về `data` trực tiếp; có error → ném ApiError.
 */
export async function apiFetch<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, formData, signal } = opts;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: formData ? undefined : { "Content-Type": "application/json" },
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      cache: "no-store",
      credentials: "same-origin",
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError("NETWORK", "Mạng có vấn đề, kiểm tra kết nối nhé!", 0);
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    // body không phải JSON
  }

  if (res.ok && payload?.success && payload.data !== null) {
    return payload.data;
  }

  const code = payload?.error?.code ?? (res.status === 401 ? "AUTH_REQUIRED" : "INTERNAL");
  const message =
    payload?.error?.message ??
    (res.ok ? "Response thiếu khung data chuẩn (lỗi server)" : "Lỗi không xác định");
  throw new ApiError(code, message, res.status, payload?.error?.details);
}
