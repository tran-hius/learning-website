import { Router } from "express";
import { roadmapController } from "../controllers";
import { requireAuth } from "../middlewares";
import { asyncHandler } from "../utils/async-handler";

/**
 * Roadmap routes — contract mục 7 (R1–R5), prefix /api/v1.
 * R1/R2 🔓 public; R3/R4 requireAuth; R5 (POST /progress/placement-test) nằm ở
 * progressRouter vì cùng prefix /progress.
 */
export const roadmapRouter = Router();

// R1 — list lộ trình (public)
roadmapRouter.get("/roadmaps", asyncHandler(roadmapController.listRoadmaps));
// R3 — enroll (trước /:slug? KHÔNG: R3 là POST, R2 là GET /:slug — không xung đột method)
roadmapRouter.post("/roadmaps/:id/enroll", requireAuth, asyncHandler(roadmapController.enrollRoadmap));
// R4 — tiến độ của tôi
roadmapRouter.get(
  "/roadmaps/me/:enrollmentId",
  requireAuth,
  asyncHandler(roadmapController.getMyRoadmapProgress),
);
// TASK-007 — enrollments của user (trước /:slug để không bị nuốt)
roadmapRouter.get("/roadmaps/me", requireAuth, asyncHandler(roadmapController.listMyEnrollments));
// R2 — tree lộ trình (GET, để sau cùng tránh nuốt /me)
roadmapRouter.get("/roadmaps/:slug", asyncHandler(roadmapController.getRoadmap));
