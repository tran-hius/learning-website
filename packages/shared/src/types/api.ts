/**
 * Khung response chung — khớp docs/api-contract.md v1.0 (mục 1).
 * Nguồn chân lý: docs/api-contract.md — mọi thay đổi contract phải cập nhật tại đây.
 */

export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_INVALID"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "EXAM_STATE_CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

export interface ApiErrorPayload {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

/** Envelope dạng rộng (code: string) — dùng cho parser phía client. */
export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorPayload | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}
