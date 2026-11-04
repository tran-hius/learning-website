import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";
import { sendFail } from "../utils/response";
import { logger } from "../utils/logger";

/**
 * Express error middleware: AppError + ZodError -> contract envelope.
 * Never leaks stack traces or internal messages to the client.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    sendFail(res, err.code, err.message, err.status, err.details);
    return;
  }

  if (err instanceof ZodError) {
    sendFail(res, "VALIDATION_ERROR", "Request validation failed", 422, err.flatten());
    return;
  }

  logger.error({ err }, "Unhandled API error");
  sendFail(res, "INTERNAL", "Internal server error", 500);
}

/** 404 fallback for unknown routes. */
export function notFoundHandler(_req: Request, res: Response): void {
  sendFail(res, "NOT_FOUND", "Route not found", 404);
}
