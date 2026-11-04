import { apiFetch } from "./client";
import type {
  AuthResponse,
  LoginInput,
  MeResponse,
  RegisterInput,
  UpdateProfileInput,
} from "./types";

/** A1 — Đăng ký */
export function register(input: RegisterInput): Promise<AuthResponse> {
  return apiFetch("/auth/register", { method: "POST", body: input });
}

/** A2 — Đăng nhập */
export function login(input: LoginInput): Promise<AuthResponse> {
  return apiFetch("/auth/login", { method: "POST", body: input });
}

/** A5 — Đổi access token bằng refresh cookie */
export function refresh(): Promise<{ ok: boolean }> {
  return apiFetch("/auth/refresh", { method: "POST", body: {} });
}

/** A6 — Đăng xuất (xoá cookie + thu hồi refresh) */
export function logout(): Promise<{ ok: boolean }> {
  return apiFetch("/auth/logout", { method: "POST", body: {} });
}

/** A7 — Thông tin user hiện tại + streak stats */
export function getMe(): Promise<MeResponse> {
  return apiFetch("/auth/me");
}

/** U1 — Cập nhật profile */
export function updateMyProfile(input: UpdateProfileInput): Promise<AuthResponse> {
  return apiFetch("/users/me", { method: "PATCH", body: input });
}

/** U2 — Đổi mật khẩu */
export function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: boolean }> {
  return apiFetch("/users/me/password", { method: "PATCH", body: input });
}
