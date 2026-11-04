import { Router } from "express";
import { contentController } from "../controllers";
import { requireAuth } from "../middlewares";
import { asyncHandler } from "../utils/async-handler";

/**
 * Content routes — contract mục 3.2 (S1–S4, L1–L2), prefix /api/v1.
 * S1/S2 🔓 public; S3/S4/L1/L2 role STUDENT (mọi user đăng nhập — TEACHER/ADMIN
 * cũng học được, contract ghi role chính đích là STUDENT).
 */
export const contentRouter = Router();

// S1 🔓
contentRouter.get("/subjects", asyncHandler(contentController.listSubjects));
// S2 🔓
contentRouter.get("/subjects/:slug", asyncHandler(contentController.getSubject));
// S3 — đăng nhập (D12: giữ requireAuth)
contentRouter.get(
  "/subjects/:slug/chapters/:chapterId",
  requireAuth,
  asyncHandler(contentController.getChapter),
);

// L2 phải đăng ký TRƯỚC /lessons/:lessonId để không bị nuốt bởi param route (D12: giữ requireAuth).
contentRouter.get("/lessons/up-next", requireAuth, asyncHandler(contentController.upNextLesson));
// D10: by-slug phải đăng ký TRƯỚC /lessons/:lessonId (reason như L2).
contentRouter.get(
  "/lessons/by-slug/:slug",
  requireAuth, // D12 — giữ requireAuth như S4
  asyncHandler(contentController.getLessonBySlug),
);
// S4 — đăng nhập, câu hỏi ẩn đáp án (D12: giữ requireAuth)
contentRouter.get("/lessons/:lessonId", requireAuth, asyncHandler(contentController.getLesson));
// L1 — +XP (D12: giữ requireAuth)
contentRouter.post(
  "/lessons/:lessonId/complete",
  requireAuth,
  asyncHandler(contentController.completeLesson),
);
