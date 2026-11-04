import { z } from "zod";

/**
 * Validations progress & roadmap (contract mục 6 + 7 — TASK-006).
 */

/** G6: POST /progress/pomodoro — D14: minutes ∈ [25..60], completedAt optional (ISO). */
export const pomodoroSchema = z.object({
  minutes: z.number().int().min(25).max(60),
  completedAt: z.string().datetime().optional(),
});

/** G3: ?days=30 (1..90). */
export const timelineQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
});

/** G4: ?year=2026 (mặc định năm hiện tại). */
export const streakCalendarQuerySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2000)
    .max(2100)
    .default(new Date().getUTCFullYear()),
});

export const roadmapSlugParamSchema = z.object({
  slug: z.string().trim().min(1),
});

export const roadmapIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const enrollmentIdParamSchema = z.object({
  enrollmentId: z.string().trim().min(1),
});

/** R5: alias POST /exams kind PLACEMENT_TEST — examBankId/subjectSlug đều optional. */
export const placementTestSchema = z.object({
  examBankId: z.string().trim().min(1).optional(),
  subjectSlug: z.string().trim().min(1).optional(),
});

export type PomodoroInput = z.infer<typeof pomodoroSchema>;
export type TimelineQuery = z.infer<typeof timelineQuerySchema>;
export type StreakCalendarQuery = z.infer<typeof streakCalendarQuerySchema>;
export type PlacementTestInput = z.infer<typeof placementTestSchema>;
