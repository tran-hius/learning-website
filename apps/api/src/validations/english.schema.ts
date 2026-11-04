import { z } from "zod";

/**
 * Validations tiếng Anh đặc thù (contract mục 8 — TASK-004, S_E1/S_E2).
 * Multipart file `audio` được multer kiểm (size ≤3MB, mimetype); body field
 * là string → parse bằng zod sau khi multer parse xong.
 */
export const speakingAttemptBodySchema = z.object({
  modelAudioUrl: z.string().url().max(2048),
  prompt: z.string().trim().min(1).max(2000),
});

export const speakingAttemptFileSchema = z
  .object({
    fieldname: z.string(),
    mimetype: z.string(),
    size: z.number().int().positive(),
    buffer: z.instanceof(Uint8Array),
  })
  .passthrough();

export const listeningResourceParamSchema = z.object({
  resourceId: z.string().trim().min(1),
});

export type SpeakingAttemptBodyInput = z.infer<typeof speakingAttemptBodySchema>;
