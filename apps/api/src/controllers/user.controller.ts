import type { Request, Response } from "express";
import { UserService } from "../services/user.service";
import { sendOk } from "../utils/response";
import { AppError } from "../utils/errors";
import { asyncHandler } from "../utils/async-handler";
import {
  changePasswordSchema,
  listUsersQuerySchema,
  updateProfileSchema,
  updateRoleSchema,
  updateStatusSchema,
} from "../validations";
import { AuthService } from "../services";
import type { Role } from "@learning/shared";

const userService = new UserService();
const authService = new AuthService();

function requireAuthContext(req: Request): { userId: string; role: Role } {
  if (!req.auth) {
    throw new AppError("AUTH_REQUIRED", "Authentication required", 401);
  }
  return req.auth;
}

/** U1: PATCH /users/me — any. */
export const updateMe = asyncHandler(async (req, res) => {
  const { userId } = requireAuthContext(req);
  const input = updateProfileSchema.parse(req.body);
  sendOk(res, await userService.updateProfile(userId, input));
});

/** U2: PATCH /users/me/password — any. Đổi xong thu hồi mọi refresh token cũ. */
export const changeMyPassword = asyncHandler(async (req, res) => {
  const { userId } = requireAuthContext(req);
  const input = changePasswordSchema.parse(req.body);
  await authService.changePassword(userId, input.currentPassword, input.newPassword);
  sendOk(res, {});
});

/** U3: GET /users — ADMIN, phân trang + filter role/q. */
export const listUsers = asyncHandler(async (req, res) => {
  requireAuthContext(req);
  const query = listUsersQuerySchema.parse(req.query);
  sendOk(res, await userService.listUsers(query));
});

/** U4: PATCH /users/:id/role — ADMIN. */
export const updateUserRole = asyncHandler(async (req, res) => {
  requireAuthContext(req);
  const id = req.params.id ?? "";
  const { role } = updateRoleSchema.parse(req.body);
  sendOk(res, await userService.updateRole(id, role));
});

/** U5: PATCH /users/:id/status — ADMIN. */
export const updateUserStatus = asyncHandler(async (req, res) => {
  requireAuthContext(req);
  const id = req.params.id ?? "";
  const { status } = updateStatusSchema.parse(req.body);
  sendOk(res, await userService.updateStatus(id, status));
});

export const userController = {
  updateMe,
  changeMyPassword,
  listUsers,
  updateUserRole,
  updateUserStatus,
};
