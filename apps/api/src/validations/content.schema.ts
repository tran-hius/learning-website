import { z } from "zod";

/**
 * Validations cho content endpoints (contract mục 3) — TASK-003.
 * S1–S4, L1–L2 chủ yếu đọc params; C1–C11 validate body tạo/sửa content.
 */

const slugField = z
  .string()
  .trim()
  .min(1, "slug is required")
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case (a-z, 0-9, -)");

// ── Subject (C1/C2) ──────────────────────────────────────────────────────

export const createSubjectSchema = z.object({
  slug: slugField,
  name: z.string().trim().min(1).max(200),
  icon: z.string().max(64).optional(),
  color: z.string().max(32).optional(),
  order: z.number().int().min(0).optional(),
  description: z.string().max(2000).optional(),
});

export const updateSubjectSchema = createSubjectSchema.partial();

// ── Chapter (C3/C4) ──────────────────────────────────────────────────────

export const createChapterSchema = z.object({
  title: z.string().trim().min(1).max(200),
  order: z.number().int().min(0).optional(),
});

export const updateChapterSchema = createChapterSchema.partial();

// ── Lesson (C5/C6) ───────────────────────────────────────────────────────

export const createLessonSchema = z.object({
  slug: slugField,
  title: z.string().trim().min(1).max(200),
  content: z.string().max(100_000).optional(),
  media: z.unknown().optional(),
  estimatedMinutes: z.number().int().min(1).max(600).optional(),
  thinkingSection: z.string().max(100_000).optional(),
  order: z.number().int().min(0).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

export const updateLessonSchema = createLessonSchema.partial();

// ── PracticeSet (C7/C8) ──────────────────────────────────────────────────

export const practiceModeSchema = z.enum([
  "LISTENING",
  "SPEAKING",
  "READING",
  "WRITING",
  "CODING",
  "QUIZ",
]);

export const createPracticeSetSchema = z.object({
  mode: practiceModeSchema,
  payload: z.unknown().optional(),
  order: z.number().int().min(0).optional(),
  /** C7 cho phép tạo kèm câu hỏi trong cùng request. */
  questions: z.array(z.lazy(() => questionCoreSchema)).max(100).optional(),
});

export const updatePracticeSetSchema = createPracticeSetSchema
  .omit({ questions: true })
  .partial();

// ── Question (C9/C10/C11) ────────────────────────────────────────────────

export const questionTypeSchema = z.enum([
  "MCQ_SINGLE",
  "MCQ_MULTI",
  "FILL_ANSWER",
  "MATCH_PAIRS",
  "LISTEN_MCQ",
]);

export const difficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);

export const questionOptionSchema = z.object({
  id: z.string().trim().min(1).max(64),
  content: z.string().min(1).max(2000),
  extra: z.unknown().optional(),
});

export const questionAnswerSchema = z.object({
  correctOptionIds: z.array(z.string().min(1)).optional(),
  correctText: z.string().min(1).max(2000).optional(),
  pairs: z
    .array(
      z.object({
        left: z.string().min(1).max(500),
        right: z.string().min(1).max(500),
      }),
    )
    .optional(),
});

/**
 * Lõi câu hỏi dùng chung cho C7 (trong practice set) và C9/C11.
 * `answer` phải khớp `type` — validate bằng superRefine, KHÔNG tự suy diễn shape.
 */
export const questionBaseSchema = z.object({
  type: questionTypeSchema,
  difficulty: difficultySchema.optional(),
  stem: z.string().trim().min(1).max(10_000),
  media: z
    .object({
      imageUrls: z.array(z.string().url()).optional(),
      audioUrl: z.string().url().optional(),
      audioScripts: z.array(z.string()).optional(),
    })
    .partial()
    .optional(),
  options: z.array(questionOptionSchema).optional(),
  answer: questionAnswerSchema,
  explanation: z.string().max(20_000).optional(),
  thinkingHints: z.array(z.string().max(2000)).max(2).optional(),
  hintAnswerRef: z.string().max(2000).optional(),
});

type QuestionCoreLike = z.infer<typeof questionBaseSchema>;
type QuestionCtx = { addIssue: (issue: { code: "custom"; path?: (string | number)[]; message: string }) => void };

/** Ràng buộc answer khớp type — dùng chung cho create (đầy đủ) và update (khi có type). */
function refineAnswerMatchesType(q: QuestionCoreLike, ctx: QuestionCtx): void {
  const answer = q.answer ?? {};
  const mcqLike =
    q.type === "MCQ_SINGLE" || q.type === "MCQ_MULTI" || q.type === "LISTEN_MCQ";
  if (mcqLike) {
    if (!q.options || q.options.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: `${q.type} requires at least 2 options`,
      });
      return;
    }
    const ids = q.options.map((o) => o.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Option ids must be unique",
      });
    }
    const correct = answer.correctOptionIds ?? [];
    if (correct.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["answer", "correctOptionIds"],
        message: `${q.type} requires answer.correctOptionIds`,
      });
    } else if (correct.some((id) => !ids.includes(id))) {
      ctx.addIssue({
        code: "custom",
        path: ["answer", "correctOptionIds"],
        message: "correctOptionIds must reference existing option ids",
      });
    } else if (q.type === "MCQ_SINGLE" && correct.length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["answer", "correctOptionIds"],
        message: "MCQ_SINGLE requires exactly 1 correct option",
      });
    }
    return;
  }
  if (q.type === "FILL_ANSWER") {
    if (!answer.correctText) {
      ctx.addIssue({
        code: "custom",
        path: ["answer", "correctText"],
        message: "FILL_ANSWER requires answer.correctText",
      });
    }
    return;
  }
  // MATCH_PAIRS
  if (!answer.pairs || answer.pairs.length < 1) {
    ctx.addIssue({
      code: "custom",
      path: ["answer", "pairs"],
      message: "MATCH_PAIRS requires answer.pairs",
    });
  }
}

export const questionCoreSchema = questionBaseSchema.superRefine(refineAnswerMatchesType);

/** C9: tạo 1 câu hỏi — phải gắn vào practice set hoặc exam bank. */
export const createQuestionSchema = questionBaseSchema
  .extend({
    practiceSetId: z.string().min(1).optional(),
    examBankId: z.string().min(1).optional(),
  })
  .superRefine((q, ctx) => {
    if (!q.practiceSetId && !q.examBankId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["practiceSetId"],
        message: "Question must belong to a practiceSetId or examBankId",
      });
    }
    refineAnswerMatchesType(q, ctx);
  });

/** C10: sửa câu hỏi — mọi field optional; validate answer↔type khi có gửi type. */
export const updateQuestionSchema = questionBaseSchema
  .partial()
  .superRefine((q, ctx) => {
    if (q.type !== undefined) {
      refineAnswerMatchesType(q as QuestionCoreLike, ctx);
    }
  });

/** C11: bulk import JSON `{ items: QuestionItem[] }` (giới hạn an toàn). */
export const bulkQuestionsSchema = z.object({
  items: z.array(createQuestionSchema).min(1).max(200),
});

// ── Params ───────────────────────────────────────────────────────────────

export const idParamSchema = z.object({
  id: z.string().trim().min(1, "id is required"),
});

export const subjectSlugParamSchema = z.object({
  slug: z.string().trim().min(1),
});

export const chapterParamSchema = z.object({
  slug: z.string().trim().min(1),
  chapterId: z.string().trim().min(1),
});

export const lessonParamSchema = z.object({
  lessonId: z.string().trim().min(1),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
export type CreateChapterInput = z.infer<typeof createChapterSchema>;
export type UpdateChapterInput = z.infer<typeof updateChapterSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type CreatePracticeSetInput = z.infer<typeof createPracticeSetSchema>;
export type UpdatePracticeSetInput = z.infer<typeof updatePracticeSetSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type BulkQuestionsInput = z.infer<typeof bulkQuestionsSchema>;
