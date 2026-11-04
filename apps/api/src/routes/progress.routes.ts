import { Router } from "express";
import { progressController, roadmapController } from "../controllers";
import { requireAuth } from "../middlewares";
import { asyncHandler } from "../utils/async-handler";

/**
 * Progress routes — contract mục 6 (G1–G6), prefix /api/v1.
 * Mọi endpoint requireAuth (STUDENT chính đích, D12).
 * LƯU Ý: route tĩnh (/badges, /pomodoro, /placement-test) đăng ký trước route
 * tham số nếu có — hiện tại G1–G6 đều tĩnh nên không xung đột.
 */
export const progressRouter = Router();

// G1 — overview theo môn + streak + XP + level
progressRouter.get("/progress/overview", requireAuth, asyncHandler(progressController.getOverview));
// G2 — weak topics (accuracy < 0.7)
progressRouter.get("/progress/weak-topics", requireAuth, asyncHandler(progressController.getWeakTopics));
// G3 — timeline theo ngày
progressRouter.get("/progress/timeline", requireAuth, asyncHandler(progressController.getTimeline));
// G4 — streak calendar (contributions)
progressRouter.get(
  "/progress/streak-calendar",
  requireAuth,
  asyncHandler(progressController.getStreakCalendar),
);
// G5 — badges earned/upcoming
progressRouter.get("/progress/badges", requireAuth, asyncHandler(progressController.getBadges));
// G6 — pomodoro focus session (D14)
progressRouter.post("/progress/pomodoro", requireAuth, asyncHandler(progressController.recordPomodoro));
// R5 — placement test (alias POST /exams kind PLACEMENT_TEST + gợi lộ trình)
progressRouter.post(
  "/progress/placement-test",
  requireAuth,
  asyncHandler(roadmapController.startPlacementTest),
);
