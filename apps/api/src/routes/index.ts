import { Router } from "express";
import { healthController } from "../controllers";
import { authRouter } from "./auth.routes";
import { userRouter } from "./user.routes";
import { contentRouter } from "./content.routes";
import { adminRouter } from "./admin.routes";
import { practiceRouter } from "./practice.routes";
import { englishRouter } from "./english.routes";
import { examRouter } from "./exam.routes";

export const apiRouter = Router();

apiRouter.get("/health", healthController);

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/", contentRouter); // S1–S4, L1–L2 + D10 by-slug (contract mục 3.2)
apiRouter.use("/", practiceRouter); // P1–P3 (contract mục 4)
apiRouter.use("/", englishRouter); // S_E1/S_E2 (contract mục 8)
apiRouter.use("/", examRouter); // E1–E6 (contract mục 5, TASK-005)
apiRouter.use("/admin", adminRouter); // C1–C11 (contract mục 3.3)

// Domain routers tiếp theo (progress, roadmaps)
// được mount tại đây theo từng task.
