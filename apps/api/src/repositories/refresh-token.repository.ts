import { createHash, randomBytes } from "node:crypto";
import { db } from "../utils/db";

/** SHA-256 hash của refresh token — DB KHÔNG lưu token gốc. */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

export interface IRefreshTokenRepository {
  /** Tạo token mới cho user. Trả về token gốc (chỉ sống trong response/cookie). */
  create(userId: string, expiresAt: Date): Promise<string>;
  /** Tra cứu theo token gốc (hash trước khi tra). */
  findValidByToken(token: string): Promise<{
    id: string;
    userId: string;
    expiresAt: Date;
    revokedAt: Date | null;
  } | null>;
  /** Xoay vòng: thu hồi token cũ. */
  revoke(id: string): Promise<void>;
  /** Thu hồi mọi refresh token của user (logout everywhere / đổi mật khẩu). */
  revokeAllForUser(userId: string): Promise<void>;
  /** Xoá cứng record (logout). */
  deleteById(id: string): Promise<void>;
}

export class RefreshTokenRepository implements IRefreshTokenRepository {
  async create(userId: string, expiresAt: Date): Promise<string> {
    const token = generateRefreshToken();
    await db.refreshToken.create({
      data: { userId, tokenHash: hashRefreshToken(token), expiresAt },
    });
    return token;
  }

  async findValidByToken(token: string) {
    const record = await db.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(token) },
      select: { id: true, userId: true, expiresAt: true, revokedAt: true },
    });
    return record;
  }

  async revoke(id: string): Promise<void> {
    await db.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async deleteById(id: string): Promise<void> {
    await db.refreshToken.delete({ where: { id } });
  }
}
