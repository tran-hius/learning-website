import jwt, { type SignOptions } from "jsonwebtoken";
import { appEnv } from "../config";

/**
 * JWT helpers (TASK-002): access token 15 phút, cookie `at_v`.
 * Refresh token là chuỗi opaque random — lưu SHA-256 hash trong DB (RefreshToken).
 */
export const ACCESS_TOKEN_COOKIE = "at_v";
export const REFRESH_TOKEN_COOKIE = "rt_v";

/** 15 phút, theo contract mục 1.3. */
export const ACCESS_TOKEN_TTL_SEC = 15 * 60;
/** 30 ngày. */
export const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60;

export interface AccessTokenPayload {
  /** user id */
  sub: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
}

const signOptions: SignOptions = {
  expiresIn: ACCESS_TOKEN_TTL_SEC,
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, appEnv.AUTH_SECRET, signOptions);
}

/** Trả null nếu token sai/hết hạn — không ném lỗi (route tự quyết định 401 code). */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, appEnv.AUTH_SECRET);
    if (typeof decoded === "string" || decoded === null) return null;
    const { sub, role } = decoded as Record<string, unknown>;
    if (typeof sub !== "string" || sub.length === 0) return null;
    if (role !== "STUDENT" && role !== "TEACHER" && role !== "ADMIN") return null;
    return { sub, role };
  } catch {
    return null;
  }
}
