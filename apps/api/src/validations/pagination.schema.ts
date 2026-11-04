import { z } from "zod";

// Shared pagination query per contract section 1.4 (limit max 50, default 20).
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
