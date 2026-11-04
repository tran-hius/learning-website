import { z } from "zod";
import { attemptAnswerSchema } from "./practice.schema";

/**
 * Validations exam (contract mục 5 — TASK-005, E1–E6).
 * value câu hỏi dùng chung attemptAnswerSchema (BE-2: {leftId, rightId} cho MATCH_PAIRS).
 */

export const examKindSchema = z.enum(["PRACTICE_TEST", "PLACEMENT_TEST"]);

/** E1: POST /exams — placement không bắt buộc examBankId (contract E1). */
export const startExamSchema = z
  .object({
    examBankId: z.string().trim().min(1).optional(),
    kind: examKindSchema,
    subjectSlug: z.string().trim().min(1).optional(),
  })
  .refine((v) => v.kind === "PLACEMENT_TEST" || !!v.examBankId, {
    message: "examBankId is required for PRACTICE_TEST",
    path: ["examBankId"],
  });

export const sessionIdParamSchema = z.object({
  sessionId: z.string().trim().min(1),
});

/** E3: PATCH /exams/:sessionId/progress — autosave, kháng reload. */
export const examProgressSchema = z.object({
  progress: z.array(attemptAnswerSchema).max(200),
});

/** E4: POST /exams/:sessionId/submit. */
export const examSubmitSchema = z.object({
  answers: z.array(attemptAnswerSchema).max(200),
});

export type StartExamInput = z.infer<typeof startExamSchema>;
export type ExamProgressInput = z.infer<typeof examProgressSchema>;
export type ExamSubmitInput = z.infer<typeof examSubmitSchema>;
