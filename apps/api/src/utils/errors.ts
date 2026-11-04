/** Application error carrying a contract error code + HTTP status. */
export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static notFound(what = "Resource") {
    return new AppError("NOT_FOUND", `${what} not found`, 404);
  }

  static forbidden(message = "You do not have permission to perform this action") {
    return new AppError("FORBIDDEN", message, 403);
  }

  static unauthorized(message = "Authentication required") {
    return new AppError("AUTH_REQUIRED", message, 401);
  }

  static conflict(code: string, message: string) {
    return new AppError(code, message, 409);
  }
}
