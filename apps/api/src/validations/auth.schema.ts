import { z } from "zod";
import { paginationQuerySchema } from "./pagination.schema";

// Password rule per contract: >= 8 chars, bcrypt cost 10.
export const registerSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().min(1).max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  avatarUrl: z.string().url().max(2048).optional(),
  preferences: z.record(z.unknown()).optional(),
});

export const updateRoleSchema = z.object({
  role: z.enum(["STUDENT", "TEACHER", "ADMIN"]),
});

export const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "BANNED"]),
});

/** GET /users query: phân trang + filter role/q (contract U3). */
export const listUsersQuerySchema = paginationQuerySchema.extend({
  role: z.enum(["STUDENT", "TEACHER", "ADMIN"]).optional(),
  q: z.string().trim().max(100).optional(),
});

/** callbackUrl cho OAuth redirect (A3) — chỉ cho phép path tương đối. */
export const oauthStartQuerySchema = z.object({
  callbackUrl: z
    .string()
    .max(2048)
    .refine((v) => v.startsWith("/") && !v.startsWith("//"), {
      message: "callbackUrl must be a relative path",
    })
    .optional(),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
