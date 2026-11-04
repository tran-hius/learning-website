import { compare, hash } from "bcryptjs";

/**
 * Password hashing per contract mục 2: bcrypt cost 10.
 * bcryptjs = pure JS (không cần native build).
 */
const BCRYPT_COST = 10;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return compare(plain, passwordHash);
}
