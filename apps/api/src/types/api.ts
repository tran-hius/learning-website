/** Standard error envelope per docs/api-contract.md. */
export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

/** { success, data, error } — the shared response frame. */
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
