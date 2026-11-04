import { Router } from "express";
import { adminController } from "../controllers";
import { requireAuth, requireRole } from "../middlewares";
import { asyncHandler } from "../utils/async-handler";

/**
 * Admin content routes — contract mục 3.3 (C1–C11, C12 upload để sau), prefix /api/v1/admin.
 * Toàn bộ: requireRole(["TEACHER","ADMIN"]).
 */
export const adminRouter = Router();

const staff = [requireAuth, requireRole(["TEACHER", "ADMIN"])];

adminRouter.post("/subjects", ...staff, asyncHandler(adminController.createSubject)); // C1
adminRouter.patch("/subjects/:id", ...staff, asyncHandler(adminController.updateSubject)); // C2
adminRouter.post("/subjects/:id/chapters", ...staff, asyncHandler(adminController.createChapter)); // C3
adminRouter.patch("/chapters/:id", ...staff, asyncHandler(adminController.updateChapter)); // C4
adminRouter.post("/chapters/:id/lessons", ...staff, asyncHandler(adminController.createLesson)); // C5
adminRouter.patch("/lessons/:id", ...staff, asyncHandler(adminController.updateLesson)); // C6
adminRouter.post(
  "/lessons/:id/practice-sets",
  ...staff,
  asyncHandler(adminController.createPracticeSet),
); // C7
adminRouter.patch("/practice-sets/:id", ...staff, asyncHandler(adminController.updatePracticeSet)); // C8
adminRouter.post("/questions", ...staff, asyncHandler(adminController.createQuestion)); // C9
adminRouter.patch("/questions/:id", ...staff, asyncHandler(adminController.updateQuestion)); // C10
adminRouter.post("/questions/bulk", ...staff, asyncHandler(adminController.bulkCreateQuestions)); // C11
