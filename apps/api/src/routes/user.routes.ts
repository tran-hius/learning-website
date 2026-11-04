import { Router } from "express";
import { userController } from "../controllers";
import { requireAuth, requireRole } from "../middlewares";
import { asyncHandler } from "../utils/async-handler";

/** User routes — contract mục 2 (U1..U5), prefix /api/v1/users. */
export const userRouter = Router();

// /me routes phải đứng trước /:id để không bị nuốt bởi param route.
userRouter.patch("/me", requireAuth, asyncHandler(userController.updateMe)); // U1 any
userRouter.patch("/me/password", requireAuth, asyncHandler(userController.changeMyPassword)); // U2 any
userRouter.get(
  "/",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(userController.listUsers),
); // U3 ADMIN
userRouter.patch(
  "/:id/role",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(userController.updateUserRole),
); // U4 ADMIN
userRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(userController.updateUserStatus),
); // U5 ADMIN
