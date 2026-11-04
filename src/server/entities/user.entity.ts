import { UserRole, UserStatus } from "@prisma/client";

/**
 * User entity — the shape exposed through the API layer (no passwordHash leaks here).
 * Mirrors contract payload `{ id, email, name, role, avatarUrl }`.
 */
export interface UserEntity {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  xp: number;
  createdAt: Date;
}

/** Map a Prisma User row to the API-facing entity, stripping secrets. */
export function toUserEntity(row: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  xp: number;
  createdAt: Date;
}): UserEntity {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    avatarUrl: row.avatarUrl,
    xp: row.xp,
    createdAt: row.createdAt,
  };
}
