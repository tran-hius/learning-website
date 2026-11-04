import { Router } from "express";
import { healthController } from "../controllers";
import { authRouter } from "./auth.routes";
import { userRouter } from "./user.routes";
import { contentRouter } from "./content.routes";
import { adminRouter } from "./admin.routes";

export const apiRouter = Router();

apiRouter.get("/health", healthController);

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/", contentRouter); // S1–S4, L1–L2 (contract mục 3.2)
apiRouter.use("/admin", adminRouter); // C1–C11 (contract mục 3.3)

// Domain routers tiếp theo (exams, progress, roadmaps)
// được mount tại đây theo từng task.
