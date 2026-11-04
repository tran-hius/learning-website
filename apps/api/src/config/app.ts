import { z } from "zod";

/**
 * Env schema + production guard.
 *
 * Điều kiện từ final-reviewer (TASK-002):
 * - DATABASE_URL / REDIS_URL / AUTH_SECRET KHÔNG có .default() trong production.
 * - Production thiếu biến bắt buộc, hoặc AUTH_SECRET còn giá trị dev → throw ngay lúc startup.
 * - Non-production (development/test) được phép dùng default để scaffold chạy được.
 */

const DEV_DATABASE_URL = "mysql://dev:dev@localhost:3306/scaffold_dev";
const DEV_REDIS_URL = "redis://localhost:6379";
const DEV_AUTH_SECRET = "dev-only-secret-key-please-rotate";

const baseShape = {
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  /** Base URL của API — dùng để dựng OAuth redirect URI. */
  API_BASE_URL: z.string().default("http://localhost:4000"),
  CLOUDINARY_CLOUD_NAME: z.string().default(""),
  CLOUDINARY_API_KEY: z.string().default(""),
  CLOUDINARY_API_SECRET: z.string().default(""),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GITHUB_CLIENT_ID: z.string().default(""),
  GITHUB_CLIENT_SECRET: z.string().default(""),
};

/**
 * NODE_ENV chưa qua zod lúc build schema → đọc thô từ process.env.
 * Thiếu/không hợp lệ thì coi như development (default của zod sẽ xử lý phần còn lại).
 */
const isProduction = process.env.NODE_ENV === "production";

const envSchema = z.object({
  ...baseShape,
  DATABASE_URL: isProduction
    ? z.string().min(1, "DATABASE_URL is required in production")
    : z.string().min(1).default(DEV_DATABASE_URL),
  REDIS_URL: isProduction
    ? z.string().min(1, "REDIS_URL is required in production")
    : z.string().min(1).default(DEV_REDIS_URL),
  AUTH_SECRET: isProduction
    ? z
        .string()
        .min(16, "AUTH_SECRET must be at least 16 characters")
        .refine((v) => v !== DEV_AUTH_SECRET, {
          message: "AUTH_SECRET is still the dev default — set a real secret",
        })
    : z.string().min(16).default(DEV_AUTH_SECRET),
});

export type AppEnv = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast at startup with a readable message, without leaking secrets.
  const issues = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const appEnv: AppEnv = parsed.data;
export const isProdEnv = appEnv.NODE_ENV === "production";
