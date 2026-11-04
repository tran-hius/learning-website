import type { Request, Response } from "express";
import { ContentService } from "../services/content.service";
import { sendOk } from "../utils/response";
import { AppError } from "../utils/errors";
import { asyncHandler } from "../utils/async-handler";
import { subjectSlugParamSchema, chapterParamSchema, lessonParamSchema } from "../validations";

/**
 * Content controller — contract mục 3.2 (S1–S4, L1–L2), TASK-003.
 * S1/S2 🔓 public; S3/S4/L1/L2 yêu cầu đăng nhập (role STUDENT theo contract,
 * TEACHER/ADMIN cũng được xem với tư cách user học).
 */
const contentService = new ContentService();

function requireAuthContext(req: Request): { userId: string } {
  if (!req.auth) {
    throw new AppError("AUTH_REQUIRED", "Authentication required", 401);
  }
  return { userId: req.auth.userId };
}

/** S1: GET /subjects 🔓 */
export const listSubjects = asyncHandler(async (_req, res) => {
  sendOk(res, await contentService.listSubjects());
});

/** S2: GET /subjects/:slug 🔓 */
export const getSubject = asyncHandler(async (req, res) => {
  const { slug } = subjectSlugParamSchema.parse(req.params);
  sendOk(res, await contentService.getSubjectBySlug(slug));
});

/** S3: GET /subjects/:slug/chapters/:chapterId (D12: giữ requireAuth) */
export const getChapter = asyncHandler(async (req, res) => {
  const { userId } = requireAuthContext(req);
  const { slug, chapterId } = chapterParamSchema.parse(req.params);
  sendOk(res, await contentService.getChapter(slug, chapterId, userId));
});

/** S4: GET /lessons/:lessonId — câu hỏi ẨN đáp án (D12: giữ requireAuth). */
export const getLesson = asyncHandler(async (req, res) => {
  requireAuthContext(req);
  const { lessonId } = lessonParamSchema.parse(req.params);
  sendOk(res, await contentService.getLesson(lessonId));
});

/** D10: GET /lessons/by-slug/:slug — như S4 nhưng tra theo slug toàn cục. */
export const getLessonBySlug = asyncHandler(async (req, res) => {
  requireAuthContext(req); // D12 — giữ requireAuth như S4
  const { slug } = subjectSlugParamSchema.parse(req.params);
  sendOk(res, await contentService.getLessonBySlug(slug));
});

/** L1: POST /lessons/:lessonId/complete — +XP 10 (D12: giữ requireAuth). */
export const completeLesson = asyncHandler(async (req, res) => {
  const { userId } = requireAuthContext(req);
  const { lessonId } = lessonParamSchema.parse(req.params);
  sendOk(res, await contentService.completeLesson(userId, lessonId), 201);
});

/** L2: GET /lessons/up-next — gợi ý bài tiếp theo (D12: giữ requireAuth). */
export const upNextLesson = asyncHandler(async (req, res) => {
  const { userId } = requireAuthContext(req);
  sendOk(res, await contentService.upNext(userId));
});

export const contentController = {
  listSubjects,
  getSubject,
  getChapter,
  getLesson,
  getLessonBySlug,
  completeLesson,
  upNextLesson,
};
