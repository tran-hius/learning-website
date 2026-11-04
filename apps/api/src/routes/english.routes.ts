import { Router } from "express";
import multer from "multer";
import { englishController } from "../controllers";
import { requireAuth } from "../middlewares";
import { asyncHandler } from "../utils/async-handler";

/**
 * English routes — contract mục 8 (S_E1/S_E2), prefix /api/v1.
 * S_E1 multipart: multer memoryStorage, giới hạn 3MB, chỉ nhận audio/*.
 * content-type lạ bị từ chối tại fileFilter; magic bytes kiểm tiếp ở service.
 */
export const englishRouter = Router();

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("audio/")) {
      cb(new Error("Only audio files are allowed"));
      return;
    }
    cb(null, true);
  },
});

// S_E1 — upload bản ghi nói (multipart)
englishRouter.post(
  "/english/speaking/attempt",
  requireAuth,
  audioUpload.single("audio"),
  asyncHandler(englishController.createSpeakingAttempt),
);
// S_E2 — metadata audio nghe
englishRouter.get(
  "/english/listening/:resourceId",
  requireAuth,
  asyncHandler(englishController.getListeningResource),
);
