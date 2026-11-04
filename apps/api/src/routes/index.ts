import { Router } from "express";
import { healthController } from "../controllers";

export const apiRouter = Router();

apiRouter.get("/health", healthController);

// Domain routers (auth, users, subjects, lessons, exams, progress, roadmaps,
// admin) are mounted here task-by-task, e.g.:
//   apiRouter.use("/auth", authRouter);
