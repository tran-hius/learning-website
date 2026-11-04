import type { Request, Response } from "express";
import { ExamService } from "../services/exam.service";
import { sendOk } from "../utils/response";
import { AppError } from "../utils/errors";
import { asyncHandler } from "../utils/async-handler";
import {
  startExamSchema,
  sessionIdParamSchema,
  examProgressSchema,
  examSubmitSchema,
} from "../validations";

/**
 * Exam controller — contract mục 5 (E1–E6), TASK-005.
 * Mọi endpoint requireAuth (STUDENT là chính; TEACHER/ADMIN cũng được — D12).
 */
const examService = new ExamService();

function requireAuthContext(req: Request): string {
  if (!req.auth) {
    throw new AppError("AUTH_REQUIRED", "Authentication required", 401);
  }
  return req.auth.userId;
}

/** E1: POST /exams — bắt đầu thi/thi thử (resume nếu còn session IN_PROGRESS). */
export const startExam = asyncHandler(async (req, res) => {
  const userId = requireAuthContext(req);
  const input = startExamSchema.parse(req.body);
  sendOk(res, await examService.startExam(userId, input), 201);
});

/** E2: GET /exams/:sessionId/questions — đề đã random, ẩn đáp án. */
export const getSessionQuestions = asyncHandler(async (req, res) => {
  const userId = requireAuthContext(req);
  const { sessionId } = sessionIdParamSchema.parse(req.params);
  sendOk(res, await examService.getSessionQuestions(userId, sessionId));
});

/** E3: PATCH /exams/:sessionId/progress — autosave đáp án tạm. */
export const saveProgress = asyncHandler(async (req, res) => {
  const userId = requireAuthContext(req);
  const { sessionId } = sessionIdParamSchema.parse(req.params);
  const input = examProgressSchema.parse(req.body);
  sendOk(res, await examService.saveProgress(userId, sessionId, input));
});

/** E4: POST /exams/:sessionId/submit — chấm tự động + XP (+5/câu đúng). */
export const submitExam = asyncHandler(async (req, res) => {
  const userId = requireAuthContext(req);
  const { sessionId } = sessionIdParamSchema.parse(req.params);
  const input = examSubmitSchema.parse(req.body);
  sendOk(res, await examService.submitExam(userId, sessionId, input));
});

/** E5: GET /exams/history — lịch sử thi của user. */
export const getExamHistory = asyncHandler(async (req, res) => {
  const userId = requireAuthContext(req);
  sendOk(res, await examService.getHistory(userId));
});

/** E6: GET /exams/:sessionId — chi tiết 1 lần thi đã nộp (kèm perQuestion). */
export const getExamResult = asyncHandler(async (req, res) => {
  const userId = requireAuthContext(req);
  const { sessionId } = sessionIdParamSchema.parse(req.params);
  sendOk(res, await examService.getSubmittedResult(userId, sessionId));
});

export const examController = {
  startExam,
  getSessionQuestions,
  saveProgress,
  submitExam,
  getExamHistory,
  getExamResult,
};
