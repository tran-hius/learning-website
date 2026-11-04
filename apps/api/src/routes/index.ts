import { Router } from "express";
import { healthController } from "../controllers";
import { authRouter } from "./auth.routes";
import { userRouter } from "./user.routes";

export const apiRouter = Router();

apiRouter.get("/health", healthController);

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);

// Domain routers tiếp theo (subjects, lessons, exams, progress, roadmaps, admin)
// được mount tại đây theo từng task.
