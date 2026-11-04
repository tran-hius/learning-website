import type { NextFunction, Request, Response } from "express";
import { sendFail } from "../utils/response";

export type Role = "STUDENT" | "TEACHER" | "ADMIN";

/** Authenticated requester attached by the auth middleware in a later task. */
export interface AuthContext {
  userId: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/**
 * Express middleware guarding a route behind one of `roles`.
 * Usage: router.get("/admin/x", requireRole(["ADMIN"]), handler)
 */
export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // TODO(auth task): populate req.auth from the JWT access token.
    const auth = req.auth;
    if (!auth) {
      sendFail(res, "AUTH_REQUIRED", "Authentication required", 401);
      return;
    }
    if (!roles.includes(auth.role)) {
      sendFail(res, "FORBIDDEN", "Insufficient permissions", 403);
      return;
    }
    next();
  };
}
