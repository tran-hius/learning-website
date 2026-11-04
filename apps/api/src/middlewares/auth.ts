import type { NextFunction, Request, Response } from "express";
import { ACCESS_TOKEN_COOKIE, verifyAccessToken } from "../utils/jwt";
import { sendFail } from "../utils/response";
import { db } from "../utils/db";

/**
 * Auth middleware (TASK-002): đọc access token từ cookie `at_v` (httpOnly),
 * verify JWT và gắn `req.auth`. User BANNED → mọi endpoint guard trả FORBIDDEN.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[ACCESS_TOKEN_COOKIE];
  if (typeof token !== "string" || token.length === 0) {
    sendFail(res, "AUTH_REQUIRED", "Authentication required", 401);
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    sendFail(res, "AUTH_INVALID", "Invalid or expired access token", 401);
    return;
  }

  db.user
    .findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, status: true },
    })
    .then((user) => {
      if (!user) {
        sendFail(res, "AUTH_INVALID", "User no longer exists", 401);
        return;
      }
      if (user.status === "BANNED") {
        sendFail(res, "FORBIDDEN", "Account is banned", 403);
        return;
      }
      // Role resolve từ DB (fresh) — role trong JWT chỉ là claim dự phòng.
      req.auth = { userId: user.id, role: user.role };
      next();
    })
    .catch(next);
}
