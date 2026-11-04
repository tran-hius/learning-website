import { Router } from "express";
import { examController } from "../controllers";
import { requireAuth } from "../middlewares";
import { asyncHandler } from "../utils/async-handler";

/**
 * Exam routes — contract mục 5 (E1–E6), prefix /api/v1.
 * Mọi endpoint requireAuth (STUDENT chính đích, D12).
 * LƯU Ý: /exams/history phải đăng ký TRƯỚC /exams/:sessionId để không bị nuốt param.
 */
export const examRouter = Router();

// E1 — bắt đầu thi/thi thử
examRouter.post("/exams", requireAuth, asyncHandler(examController.startExam));
// E5 — lịch sử thi (trước /:sessionId)
examRouter.get("/exams/history", requireAuth, asyncHandler(examController.getExamHistory));
// E2 — lấy đề (ẩn đáp án)
examRouter.get(
  "/exams/:sessionId/questions",
  requireAuth,
  asyncHandler(examController.getSessionQuestions),
);
// E3 — autosave đáp án tạm
examRouter.patch(
  "/exams/:sessionId/progress",
  requireAuth,
  asyncHandler(examController.saveProgress),
);
// E4 — nộp bài + chấm tự động
examRouter.post(
  "/exams/:sessionId/submit",
  requireAuth,
  asyncHandler(examController.submitExam),
);
// E6 — chi tiết 1 lần thi đã nộp
examRouter.get("/exams/:sessionId", requireAuth, asyncHandler(examController.getExamResult));
