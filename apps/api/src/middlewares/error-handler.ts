import { ZodError } from "zod";
import { AppError } from "../utils/errors";
import { fail, logger } from "../utils";
import { NextResponse } from "next/server";

type Handler<Args extends unknown[]> = (
  ...args: Args
) => Promise<NextResponse> | NextResponse;

/** Wrap a route handler: AppError + ZodError -> contract envelope, swallows stack traces. */
export function withErrorHandling<Args extends unknown[]>(
  handler: Handler<Args>,
): Handler<Args> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof AppError) {
        return fail(err.code, err.message, err.status, err.details);
      }
      if (err instanceof ZodError) {
        return fail("VALIDATION_ERROR", "Request validation failed", 422, err.flatten());
      }
      logger.error({ err }, "Unhandled API error");
      // Never expose internals/stack to the client.
      return fail("INTERNAL", "Internal server error", 500);
    }
  };
}
