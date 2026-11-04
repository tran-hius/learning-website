import { NextResponse } from "next/server";

/** Standard error envelope per docs/api-contract.md. */
export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

/** { success, data, error: { code, message } } — the shared response frame. */
export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: ApiErrorBody | null;
};

/** List wrapper with pagination, per contract section 1.4. */
export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  items: T[];
  pagination: Pagination;
};

export function ok<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { success: true, data, error: null },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function fail(
  code: string,
  message: string,
  status = 500,
  details?: unknown,
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: { code, message, ...(details !== undefined ? { details } : {}) },
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
