/**
 * Re-export of the shared API response types so server code imports from one place.
 * Types live in utils/response.ts next to the ok()/fail() helpers.
 */
export type {
  ApiResponse,
  Paginated,
  Pagination,
  ApiErrorBody,
} from "../utils/response";
