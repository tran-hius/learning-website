import type { ListUsersOptions, UserFullRow } from "../repositories";
import { UserRepository } from "../repositories";
import { AppError } from "../utils/errors";
import type { Role } from "@learning/shared";
import type { UpdateProfileInput, UpdateStatusInput } from "../validations";

function toPublicUser(user: UserFullRow) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl,
  };
}

export class UserService {
  constructor(private readonly users: UserRepository = new UserRepository()) {}

  private assertExists(user: UserFullRow | null): UserFullRow {
    if (!user) {
      throw new AppError("NOT_FOUND", "User not found", 404);
    }
    return user;
  }

  /** U1: PATCH /users/me */
  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await this.users.update(userId, input);
    return { user: toPublicUser(user) };
  }

  /** U3: GET /users — ADMIN, phân trang + filter role/q (contract mục 1.4). */
  async listUsers(options: ListUsersOptions) {
    const { items, total } = await this.users.list(options);
    return {
      items: items.map((u) => toPublicUser(u)),
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / options.limit)),
      },
    };
  }

  /** U4: PATCH /users/:id/role */
  async updateRole(userId: string, role: Role) {
    await this.assertExists(await this.users.findById(userId));
    const user = await this.users.update(userId, { role });
    return { id: user.id, role: user.role };
  }

  /** U5: PATCH /users/:id/status */
  async updateStatus(userId: string, status: UpdateStatusInput["status"]) {
    await this.assertExists(await this.users.findById(userId));
    const user = await this.users.update(userId, { status });
    return { id: user.id, status: user.status };
  }
}
