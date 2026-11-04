import { Prisma } from "@prisma/client";
import { db } from "../utils/db";

/** Full row shape the auth/user services work with. */
export interface UserFullRow {
  id: string;
  email: string;
  name: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  status: "ACTIVE" | "BANNED";
  avatarUrl: string | null;
  preferences: unknown;
  passwordHash: string;
  currentStreak: number;
  longestStreak: number;
  xp: number;
}

export interface ListUsersOptions {
  page: number;
  limit: number;
  role?: "STUDENT" | "TEACHER" | "ADMIN";
  q?: string;
}

export interface IUserRepository {
  findById(id: string): Promise<UserFullRow | null>;
  findByEmail(email: string): Promise<UserFullRow | null>;
  list(options: ListUsersOptions): Promise<{ items: UserFullRow[]; total: number }>;
  create(data: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<UserFullRow>;
  update(
    id: string,
    data: Partial<
      Pick<UserFullRow, "name" | "avatarUrl" | "role" | "status" | "preferences" | "passwordHash">
    >,
  ): Promise<UserFullRow>;
}

export class UserRepository implements IUserRepository {
  private readonly select = {
    id: true,
    email: true,
    name: true,
    role: true,
    status: true,
    avatarUrl: true,
    preferences: true,
    passwordHash: true,
    currentStreak: true,
    longestStreak: true,
    xp: true,
  } satisfies Prisma.UserSelect;

  async findById(id: string): Promise<UserFullRow | null> {
    return db.user.findUnique({ where: { id }, select: this.select });
  }

  async findByEmail(email: string): Promise<UserFullRow | null> {
    return db.user.findUnique({ where: { email }, select: this.select });
  }

  async list(options: ListUsersOptions): Promise<{ items: UserFullRow[]; total: number }> {
    const { page, limit, role, q } = options;
    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(q
        ? {
            OR: [{ name: { contains: q } }, { email: { contains: q } }],
          }
        : {}),
    };
    const [items, total] = await db.$transaction([
      db.user.findMany({
        where,
        select: this.select,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.user.count({ where }),
    ]);
    return { items, total };
  }

  async create(data: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<UserFullRow> {
    return db.user.create({ data, select: this.select });
  }

  async update(
    id: string,
    dataIn: Partial<
      Pick<UserFullRow, "name" | "avatarUrl" | "role" | "status" | "preferences" | "passwordHash">
    >,
  ): Promise<UserFullRow> {
    const { preferences, ...rest } = dataIn;
    const data: Prisma.UserUpdateInput = { ...rest };
    if (preferences !== undefined) {
      data.preferences = preferences as Prisma.InputJsonValue;
    }
    return db.user.update({ where: { id }, data, select: this.select });
  }
}
