import { z } from "zod";

/**
 * Validations thực hành & Python (contract mục 4 — TASK-004, P1–P3).
 * value tùy loại câu hỏi: string (MCQ/FILL), string[] (MCQ_MULTI),
 * {left, right}[] (MATCH_PAIRS).
 */
export const attemptAnswerSchema = z.object({
  questionId: z.string().trim().min(1),
  value: z.union([
    z.string(),
    z.array(z.string()),
    z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })),
  ]),
});

export const practiceAttemptSchema = z.object({
  answers: z.array(attemptAnswerSchema).min(1).max(200),
});

export const hintBodySchema = z.object({
  level: z.union([z.literal(1), z.literal(2)]),
});

export const questionIdParamSchema = z.object({
  questionId: z.string().trim().min(1),
});

/** P3: code tối đa 10.000 ký tự, stdin optional. */
export const pythonExecSchema = z.object({
  code: z.string().min(1, "code is required").max(10_000, "code must be at most 10,000 chars"),
  stdin: z.string().max(10_000).optional(),
});

export const practiceSetIdParamSchema = z.object({
  setId: z.string().trim().min(1),
});

export type PracticeAttemptInput = z.infer<typeof practiceAttemptSchema>;
export type HintBodyInput = z.infer<typeof hintBodySchema>;
export type PythonExecInput = z.infer<typeof pythonExecSchema>;
