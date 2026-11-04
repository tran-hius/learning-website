import type { NextFunction, Request, Response } from "express";

/**
 * Wrap an async controller so rejected promises reach errorHandler
 * (Express 4 does not catch async errors by itself).
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
