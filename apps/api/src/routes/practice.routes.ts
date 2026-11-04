import { Router } from "express";
import { practiceController } from "../controllers";
import { requireAuth } from "../middlewares";
import { asyncHandler } from "../utils/async-handler";

/**
 * Practice routes — contract mục 4 (P1–P3), prefix /api/v1.
 * Mọi endpoint đăng nhập (D12: role STUDENT chính đích, TEACHER/ADMIN cũng được).
 */
export const practiceRouter = Router();

// P1 — nộp bài practice, chấm server-side
practiceRouter.post(
  "/practice/:setId/attempt",
  requireAuth,
  asyncHandler(practiceController.submitPracticeAttempt),
);
// P2 — gợi ý theo bậc
practiceRouter.post(
  "/practice/hints/:questionId",
  requireAuth,
  asyncHandler(practiceController.getHint),
);
// P3 — chạy code Python qua Piston
practiceRouter.post("/python/exec", requireAuth, asyncHandler(practiceController.execPython));
