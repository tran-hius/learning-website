import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";
import { sendFail } from "../utils/response";
import { logger } from "../utils/logger";

/**
 * Express error middleware: AppError + ZodError + Prisma known errors -> contract envelope.
 * Never leaks stack traces or internal messages to the client.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (typeof err.details === "object" && err.details !== null && "rateLimitRemaining" in err.details) {
      res.set("X-RateLimit-Remaining", String((err.details as { rateLimitRemaining: number }).rateLimitRemaining));
    }
    sendFail(res, err.code, err.message, err.status, err.details);
    return;
  }

  if (err instanceof ZodError) {
    sendFail(res, "VALIDATION_ERROR", "Request validation failed", 422, err.flatten());
    return;
  }

  // Điều kiện final-reviewer TASK-003: map lỗi FK/not-found của Prisma.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2003") {
      // FK constraint violation → tham chiếu không tồn tại.
      sendFail(res, "VALIDATION_ERROR", "Referenced record does not exist", 400);
      return;
    }
    if (err.code === "P2025") {
      sendFail(res, "NOT_FOUND", "Record not found", 404);
      return;
    }
  }

  // Multer (upload multipart S_E1): lỗi size/định dạng → 422 theo contract.
  if (err instanceof MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "audio must be at most 3MB" : "File upload failed";
    sendFail(res, "VALIDATION_ERROR", message, 422);
    return;
  }

  // fileFilter của multer bọc lỗi trong Error thường — giữ message an toàn.
  if (err instanceof Error && err.message === "Only audio files are allowed") {
    sendFail(res, "VALIDATION_ERROR", err.message, 422);
    return;
  }

  logger.error({ err }, "Unhandled API error");
  sendFail(res, "INTERNAL", "Internal server error", 500);
}

/** 404 fallback for unknown routes. */
export function notFoundHandler(_req: Request, res: Response): void {
  sendFail(res, "NOT_FOUND", "Route not found", 404);
}
