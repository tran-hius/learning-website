import type { Request, Response } from "express";
import { AdminService } from "../services/admin.service";
import { sendOk } from "../utils/response";
import { AppError } from "../utils/errors";
import { asyncHandler } from "../utils/async-handler";
import {
  createSubjectSchema,
  updateSubjectSchema,
  createChapterSchema,
  updateChapterSchema,
  createLessonSchema,
  updateLessonSchema,
  createPracticeSetSchema,
  updatePracticeSetSchema,
  createQuestionSchema,
  updateQuestionSchema,
  bulkQuestionsSchema,
  idParamSchema,
} from "../validations";

/**
 * Admin content controller — contract mục 3.3 (C1–C11), TASK-003.
 * Toàn bộ route đã được guard requireRole(["TEACHER","ADMIN"]) ở route layer.
 */
const adminService = new AdminService();

function requireAuthContext(req: Request): void {
  if (!req.auth) {
    throw new AppError("AUTH_REQUIRED", "Authentication required", 401);
  }
}

/** C1: POST /admin/subjects */
export const createSubject = asyncHandler(async (req, res) => {
  requireAuthContext(req);
  const input = createSubjectSchema.parse(req.body);
  sendOk(res, await adminService.createSubject(input), 201);
});

/** C2: PATCH /admin/subjects/:id */
export const updateSubject = asyncHandler(async (req, res) => {
  requireAuthContext(req);
  const { id } = idParamSchema.parse(req.params);
  const input = updateSubjectSchema.parse(req.body);
  sendOk(res, await adminService.updateSubject(id, input));
});

/** C3: POST /admin/subjects/:id/chapters */
export const createChapter = asyncHandler(async (req, res) => {
  requireAuthContext(req);
  const { id } = idParamSchema.parse(req.params);
  const input = createChapterSchema.parse(req.body);
  sendOk(res, await adminService.createChapter(id, input), 201);
});

/** C4: PATCH /admin/chapters/:id */
export const updateChapter = asyncHandler(async (req, res) => {
  requireAuthContext(req);
  const { id } = idParamSchema.parse(req.params);
  const input = updateChapterSchema.parse(req.body);
  sendOk(res, await adminService.updateChapter(id, input));
});

/** C5: POST /admin/chapters/:id/lessons */
export const createLesson = asyncHandler(async (req, res) => {
  requireAuthContext(req);
  const { id } = idParamSchema.parse(req.params);
  const input = createLessonSchema.parse(req.body);
  sendOk(res, await adminService.createLesson(id, input), 201);
});

/** C6: PATCH /admin/lessons/:id (status DRAFT→PUBLISHED) */
export const updateLesson = asyncHandler(async (req, res) => {
  requireAuthContext(req);
  const { id } = idParamSchema.parse(req.params);
  const input = updateLessonSchema.parse(req.body);
  sendOk(res, await adminService.updateLesson(id, input));
});

/** C7: POST /admin/lessons/:id/practice-sets (kèm questions optional) */
export const createPracticeSet = asyncHandler(async (req, res) => {
  requireAuthContext(req);
  const { id } = idParamSchema.parse(req.params);
  const input = createPracticeSetSchema.parse(req.body);
  sendOk(res, await adminService.createPracticeSet(id, input), 201);
});

/** C8: PATCH /admin/practice-sets/:id */
export const updatePracticeSet = asyncHandler(async (req, res) => {
  requireAuthContext(req);
  const { id } = idParamSchema.parse(req.params);
  const input = updatePracticeSetSchema.parse(req.body);
  sendOk(res, await adminService.updatePracticeSet(id, input));
});

/** C9: POST /admin/questions → { id } */
export const createQuestion = asyncHandler(async (req, res) => {
  requireAuthContext(req);
  const input = createQuestionSchema.parse(req.body);
  sendOk(res, await adminService.createQuestion(input), 201);
});

/** C10: PATCH /admin/questions/:id */
export const updateQuestion = asyncHandler(async (req, res) => {
  requireAuthContext(req);
  const { id } = idParamSchema.parse(req.params);
  const input = updateQuestionSchema.parse(req.body);
  sendOk(res, await adminService.updateQuestion(id, input));
});

/** C11: POST /admin/questions/bulk — import JSON mảng câu hỏi. */
export const bulkCreateQuestions = asyncHandler(async (req, res) => {
  requireAuthContext(req);
  const input = bulkQuestionsSchema.parse(req.body);
  sendOk(res, await adminService.bulkCreateQuestions(input), 201);
});

export const adminController = {
  createSubject,
  updateSubject,
  createChapter,
  updateChapter,
  createLesson,
  updateLesson,
  createPracticeSet,
  updatePracticeSet,
  createQuestion,
  updateQuestion,
  bulkCreateQuestions,
};
