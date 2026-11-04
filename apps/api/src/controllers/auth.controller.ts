import type { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { sendOk } from "../utils/response";
import { AppError } from "../utils/errors";
import { asyncHandler } from "../utils/async-handler";
import { isProdEnv } from "../config";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_SEC,
  REFRESH_TOKEN_TTL_SEC,
} from "../utils/jwt";
import {
  registerSchema,
  loginSchema,
  oauthStartQuerySchema,
} from "../validations";
import type { OAuthProvider } from "../services";

const authService = new AuthService();

const OAUTH_PROVIDERS: OAuthProvider[] = ["google", "github"];

function assertProvider(value: string): OAuthProvider {
  if (!(OAUTH_PROVIDERS as string[]).includes(value)) {
    throw new AppError("NOT_FOUND", `Unknown OAuth provider "${value}"`, 404);
  }
  return value as OAuthProvider;
}

function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  const base = { httpOnly: true, secure: isProdEnv, sameSite: "lax" as const, path: "/" };
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...base,
    maxAge: ACCESS_TOKEN_TTL_SEC * 1000,
  });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...base,
    maxAge: REFRESH_TOKEN_TTL_SEC * 1000,
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/" });
}

/** A1: POST /auth/register — 🔓 */
export const register = asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const { user } = await authService.register(input);
  const tokens = await authService.issueSession(user.id, user.role);
  setAuthCookies(res, tokens);
  sendOk(res, { user }, 201);
});

/** A2: POST /auth/login — 🔓 */
export const login = asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const { user, tokens } = await authService.login(input);
  setAuthCookies(res, tokens);
  sendOk(res, { user });
});

/** A5: POST /auth/refresh — 🔓, xoay vòng rt_v. */
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_TOKEN_COOKIE];
  const { user, tokens } = await authService.refresh(token);
  setAuthCookies(res, tokens);
  sendOk(res, { user });
});

/** A6: POST /auth/logout — any: thu hồi refresh + xoá cookie. */
export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.[REFRESH_TOKEN_COOKIE]);
  clearAuthCookies(res);
  sendOk(res, {});
});

/** A7: GET /auth/me — any. */
export const me = asyncHandler(async (req, res) => {
  const auth = req.auth;
  if (!auth) throw new AppError("AUTH_REQUIRED", "Authentication required", 401);
  sendOk(res, await authService.me(auth.userId));
});

/** A3: GET /auth/oauth/:provider — 🔓: redirect ra OAuth + cookie state CSRF (+PKCE verifier). */
export const oauthStart = asyncHandler(async (req, res) => {
  const provider = assertProvider(req.params.provider ?? "");
  const { callbackUrl = "/" } = oauthStartQuerySchema.parse(req.query);
  const { url, state, codeVerifier } = authService.createAuthorizationUrl(
    provider,
    callbackUrl,
  );
  const statePayload = JSON.stringify({ provider, state, codeVerifier, callbackUrl });
  res.cookie(AuthService.OAUTH_STATE_COOKIE, statePayload, {
    httpOnly: true,
    secure: isProdEnv,
    sameSite: "lax",
    maxAge: AuthService.OAUTH_STATE_TTL_MS,
    path: "/",
  });
  res.redirect(url);
});

/** A4: GET /auth/callback/:provider — 🔓: verify state → exchange → phiên đăng nhập. */
export const oauthCallback = asyncHandler(async (req, res) => {
  const provider = assertProvider(req.params.provider ?? "");
  const raw = req.cookies?.[AuthService.OAUTH_STATE_COOKIE];
  const { state, code } = req.query as { state?: string; code?: string };

  // So khớp state CSRF (cookie gắn lúc start với query trả về).
  let stored: { provider?: string; state?: string; codeVerifier?: string | null; callbackUrl?: string } = {};
  if (typeof raw === "string" && raw.length > 0) {
    try {
      stored = JSON.parse(raw) as typeof stored;
    } catch {
      stored = {};
    }
  }
  if (
    typeof state !== "string" ||
    stored.provider !== provider ||
    stored.state !== state
  ) {
    res.clearCookie(AuthService.OAUTH_STATE_COOKIE, { path: "/" });
    throw new AppError("AUTH_INVALID", "Invalid OAuth state", 401);
  }
  const callbackUrl = typeof stored.callbackUrl === "string" && stored.callbackUrl.startsWith("/") ? stored.callbackUrl : "/";

  if (typeof code !== "string" || code.length === 0) {
    throw new AppError("AUTH_INVALID", "Missing OAuth code", 401);
  }

  const profile = await authService.fetchOAuthProfile(provider, code, stored.codeVerifier ?? undefined);
  const user = await authService.upsertOAuthUser(provider, profile);
  const tokens = await authService.issueSession(user.id, user.role);
  setAuthCookies(res, tokens);
  res.clearCookie(AuthService.OAUTH_STATE_COOKIE, { path: "/" });
  res.redirect(callbackUrl);
});

export const authController = {
  register,
  login,
  refresh,
  logout,
  me,
  oauthStart,
  oauthCallback,
};
