import { randomBytes } from "node:crypto";
import { Google, GitHub } from "arctic";
import { AppError } from "../utils/errors";
import { appEnv } from "../config";
import { hashPassword, verifyPassword } from "../utils/password";
import {
  signAccessToken,
  ACCESS_TOKEN_TTL_SEC,
  REFRESH_TOKEN_TTL_SEC,
  REFRESH_TOKEN_COOKIE,
  ACCESS_TOKEN_COOKIE,
} from "../utils/jwt";
import { UserRepository, RefreshTokenRepository } from "../repositories";
import type { UserFullRow } from "../repositories";
import type { RegisterInput, LoginInput } from "../validations";

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

/** User shape trả client theo contract: { id, email, name, role, avatarUrl }. */
export function toPublicUser(user: UserFullRow) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
}

export type OAuthProvider = "google" | "github";

export interface OAuthProfile {
  providerId: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
}

export class AuthService {
  constructor(
    private readonly users: UserRepository = new UserRepository(),
    private readonly refreshTokens: RefreshTokenRepository = new RefreshTokenRepository(),
  ) {}

  async register(input: RegisterInput): Promise<{ user: ReturnType<typeof toPublicUser> }> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new AppError("VALIDATION_ERROR", "Email is already registered", 409);
    }
    const passwordHash = await hashPassword(input.password);
    const user = await this.users.create({
      email: input.email,
      name: input.name,
      passwordHash,
    });
    return { user: toPublicUser(user) };
  }

  async login(
    input: LoginInput,
  ): Promise<{ user: ReturnType<typeof toPublicUser>; tokens: SessionTokens }> {
    const user = await this.users.findByEmail(input.email);
    if (!user) {
      throw new AppError("AUTH_INVALID", "Invalid email or password", 401);
    }
    const passwordOk = await verifyPassword(input.password, user.passwordHash);
    if (!passwordOk) {
      throw new AppError("AUTH_INVALID", "Invalid email or password", 401);
    }
    if (user.status === "BANNED") {
      throw new AppError("FORBIDDEN", "Account is banned", 403);
    }
    const tokens = await this.issueSession(user.id, user.role);
    return { user: toPublicUser(user), tokens };
  }

  /** Phát access (15 phút) + refresh (30 ngày) — refresh lưu SHA-256 hash trong DB. */
  async issueSession(userId: string, role: string): Promise<SessionTokens> {
    const accessToken = signAccessToken({ sub: userId, role: role as never });
    const refreshToken = await this.refreshTokens.create(
      userId,
      new Date(Date.now() + REFRESH_TOKEN_TTL_SEC * 1000),
    );
    return { accessToken, refreshToken };
  }

  /**
   * Xoay vòng refresh token: verify token trong DB (hash) → thu hồi token cũ → phát cặp mới.
   * Token hết hạn/thu hồi/sai → AUTH_INVALID.
   */
  async refresh(
    refreshToken: string | undefined,
  ): Promise<{ user: ReturnType<typeof toPublicUser>; tokens: SessionTokens }> {
    if (!refreshToken) {
      throw new AppError("AUTH_INVALID", "Missing refresh token", 401);
    }
    const record = await this.refreshTokens.findValidByToken(refreshToken);
    if (!record || record.revokedAt || record.expiresAt.getTime() < Date.now()) {
      throw new AppError("AUTH_INVALID", "Invalid or expired refresh token", 401);
    }
    const user = await this.users.findById(record.userId);
    if (!user) {
      throw new AppError("AUTH_INVALID", "User no longer exists", 401);
    }
    if (user.status === "BANNED") {
      throw new AppError("FORBIDDEN", "Account is banned", 403);
    }
    await this.refreshTokens.revoke(record.id);
    const tokens = await this.issueSession(user.id, user.role);
    return { user: toPublicUser(user), tokens };
  }

  /** Thu hồi refresh token + xoá cookie. */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const record = await this.refreshTokens.findValidByToken(refreshToken);
    if (record) {
      await this.refreshTokens.deleteById(record.id);
    }
  }

  /** GET /auth/me: user hiện tại + streak stats. */
  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppError("AUTH_INVALID", "User no longer exists", 401);
    }
    return {
      user: toPublicUser(user),
      stats: {
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
      },
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppError("AUTH_INVALID", "User no longer exists", 401);
    }
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) {
      throw new AppError("VALIDATION_ERROR", "Current password is incorrect", 422);
    }
    const passwordHash = await hashPassword(newPassword);
    await this.users.update(userId, { passwordHash });
    // Đổi mật khẩu → thu hồi mọi phiên đăng nhập cũ.
    await this.refreshTokens.revokeAllForUser(userId);
  }

  // ── OAuth (arctic) ────────────────────────────────────────────────────

  private oauthConfig(provider: OAuthProvider): {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  } {
    const clientId =
      provider === "google" ? appEnv.GOOGLE_CLIENT_ID : appEnv.GITHUB_CLIENT_ID;
    const clientSecret =
      provider === "google" ? appEnv.GOOGLE_CLIENT_SECRET : appEnv.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new AppError(
        "INTERNAL",
        `OAuth provider "${provider}" is not configured (missing ${provider === "google" ? "GOOGLE" : "GITHUB"}_CLIENT_ID/SECRET)`,
        503,
      );
    }
    const redirectUri = new URL(
      `/api/v1/auth/callback/${provider}`,
      appEnv.API_BASE_URL,
    ).toString();
    return { clientId, clientSecret, redirectUri };
  }

  private client(provider: OAuthProvider): Google | GitHub {
    const { clientId, clientSecret, redirectUri } = this.oauthConfig(provider);
    if (provider === "google") {
      return new Google(clientId, clientSecret, redirectUri);
    }
    return new GitHub(clientId, clientSecret, redirectUri);
  }

  /** A3: tạo authorization URL + trả state CSRF (controller lưu vào cookie tạm). */
  createAuthorizationUrl(provider: OAuthProvider, callbackUrl: string): {
    url: string;
    state: string;
    /** PKCE verifier (Google bắt buộc) — lưu cùng state trong cookie tạm. */
    codeVerifier: string | null;
  } {
    const state = randomBytes(16).toString("hex");
    if (provider === "google") {
      // Arctic v3: Google dùng PKCE bắt buộc.
      const codeVerifier = randomBytes(32).toString("base64url");
      const scopes = ["openid", "email", "profile"];
      const url = (this.client(provider) as Google).createAuthorizationURL(
        state,
        codeVerifier,
        scopes,
      );
      return { url: url.toString(), state, codeVerifier };
    }
    const scopes = ["read:user", "user:email"];
    const url = (this.client(provider) as GitHub).createAuthorizationURL(state, scopes);
    return { url: url.toString(), state, codeVerifier: null };
  }

  /** A4: exchange code → profile Google/GitHub (codeVerifier cho Google PKCE). */
  async fetchOAuthProfile(
    provider: OAuthProvider,
    code: string,
    codeVerifier?: string,
  ): Promise<OAuthProfile> {
    const client = this.client(provider);
    const tokens =
      provider === "google"
        ? await (this.client(provider) as Google).validateAuthorizationCode(
            code,
            codeVerifier ?? "",
          )
        : await (this.client(provider) as GitHub).validateAuthorizationCode(code);
    const response = await fetch(
      provider === "google"
        ? "https://openidconnect.googleapis.com/v1/userinfo"
        : "https://api.github.com/user",
      { headers: { Authorization: `Bearer ${tokens.accessToken()}` } },
    );
    if (!response.ok) {
      throw new AppError("INTERNAL", `Failed to fetch ${provider} profile`, 502);
    }
    const data = (await response.json()) as Record<string, unknown>;
    if (provider === "google") {
      return {
        providerId: String(data.sub ?? ""),
        email: typeof data.email === "string" ? data.email : null,
        name: typeof data.name === "string" && data.name.length > 0 ? data.name : "Google user",
        avatarUrl: typeof data.picture === "string" ? data.picture : null,
      };
    }
    let email = typeof data.email === "string" && data.email ? data.email : null;
    if (!email) {
      // GitHub email có thể private → hỏi /user/emails.
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${tokens.accessToken()}` },
      });
      if (emailsRes.ok) {
        const emails = (await emailsRes.json()) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        email = emails.find((e) => e.primary && e.verified)?.email ?? null;
      }
    }
    return {
      providerId: String(data.id ?? ""),
      email,
      name: typeof data.name === "string" && data.name ? data.name : String(data.login ?? "GitHub user"),
      avatarUrl: typeof data.avatar_url === "string" ? data.avatar_url : null,
    };
  }

  /**
   * Upsert user OAuth.
   *
   * QUYẾT ĐỊNH D7 (docs/api-contract.md mục 12, người dùng duyệt 05/11/2026):
   * OAuth linking = link-by-email cho MVP — profile OAuth có email trùng user cũ
   * (email được provider verify) thì đăng nhập vào user đó, KHÔNG tạo bản sao.
   * Bảng `Account` (liên kết multi-provider: 1 user – N provider) là roadmap phase sau.
   */
  async upsertOAuthUser(provider: OAuthProvider, profile: OAuthProfile): Promise<UserFullRow> {
    if (profile.email) {
      const existing = await this.users.findByEmail(profile.email);
      if (existing) return existing;
    }
    const passwordHash = await hashPassword(randomBytes(24).toString("hex"));
    const email = profile.email ?? `${provider}_${profile.providerId}@oauth.synapsebrain.local`;
    return this.users.create({
      email,
      name: profile.name,
      passwordHash,
    });
  }

  // Cookie helpers cho OAuth state — cookie tạm riêng, không đụng at_v/rt_v.
  static readonly OAUTH_STATE_COOKIE = "oauth_state";
  static readonly OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
  static readonly COOKIE_MAX_AGE_SEC = {
    access: ACCESS_TOKEN_TTL_SEC,
    refresh: REFRESH_TOKEN_TTL_SEC,
  };
  static readonly COOKIE_NAMES = {
    access: ACCESS_TOKEN_COOKIE,
    refresh: REFRESH_TOKEN_COOKIE,
  };
}
