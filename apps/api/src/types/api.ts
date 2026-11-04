/**
 * TASK-007 (D6): contract envelope types đặt tại `@learning/shared` — file này
 * chỉ re-export để các import cũ từ "../types" tiếp tục chạy. KHÔNG định nghĩa
 * type mới tại đây.
 */
export {
  type ApiErrorCode,
  type ApiErrorPayload,
  type ApiErrorBody,
  type ApiResponse,
  type Pagination,
  type Paginated,
} from "@learning/shared";
