import type { ApiResponse, ApiErrorBody } from "../types";

/** Build the standard success envelope (pure, unit-testable). */
export function okBody<T>(data: T): ApiResponse<T> {
  return { success: true, data, error: null };
}

/** Build the standard error envelope (pure, unit-testable). */
export function failBody(
  code: string,
  message: string,
  details?: unknown,
): ApiResponse<never> {
  const error: ApiErrorBody = {
    code,
    message,
    ...(details !== undefined ? { details } : {}),
  };
  return { success: false, data: null, error };
}

/** Send a success response through Express with no-store caching. */
export function sendOk<T>(
  res: import("express").Response,
  data: T,
  status = 200,
): void {
  res
    .status(status)
    .set("Cache-Control", "no-store")
    .json(okBody(data));
}

/** Send a contract-shaped error response through Express. */
export function sendFail(
  res: import("express").Response,
  code: string,
  message: string,
  status = 500,
  details?: unknown,
): void {
  res
    .status(status)
    .set("Cache-Control", "no-store")
    .json(failBody(code, message, details));
}
