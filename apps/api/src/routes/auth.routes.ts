import { Router } from "express";
import { authController } from "../controllers";
import { requireAuth } from "../middlewares";
import { asyncHandler } from "../utils/async-handler";

/** Auth routes — contract mục 2 (A1..A7), prefix /api/v1/auth. */
export const authRouter = Router();

authRouter.post("/register", asyncHandler(authController.register)); // A1 🔓
authRouter.post("/login", asyncHandler(authController.login)); // A2 🔓
authRouter.get("/oauth/:provider", asyncHandler(authController.oauthStart)); // A3 🔓
authRouter.get("/callback/:provider", asyncHandler(authController.oauthCallback)); // A4 🔓
authRouter.post("/refresh", asyncHandler(authController.refresh)); // A5 🔓
authRouter.post("/logout", requireAuth, asyncHandler(authController.logout)); // A6 any
authRouter.get("/me", requireAuth, asyncHandler(authController.me)); // A7 any
