export { registerSchema, loginSchema } from "./auth.schema";
export type { RegisterInput, LoginInput } from "./auth.schema";
import { z } from "zod";

// Shared pagination query per contract section 1.4.
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
