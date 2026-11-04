import type { Request, Response } from "express";
import { EnglishService } from "../services/english.service";
import { sendOk } from "../utils/response";
import { AppError } from "../utils/errors";
import { asyncHandler } from "../utils/async-handler";
import { speakingAttemptBodySchema, listeningResourceParamSchema } from "../validations";

/**
 * English controller — contract mục 8 (S_E1/S_E2), TASK-004.
 * S_E1 nhận multipart qua multer (route layer); S_E2 là GET metadata.
 */
const englishService = new EnglishService();

function requireAuthContext(req: Request): string {
  if (!req.auth) {
    throw new AppError("AUTH_REQUIRED", "Authentication required", 401);
  }
  return req.auth.userId;
}

/** S_E1: POST /english/speaking/attempt — multipart audio ≤3MB. */
export const createSpeakingAttempt = asyncHandler(async (req, res) => {
  const userId = requireAuthContext(req);
  const body = speakingAttemptBodySchema.parse(req.body);
  const file = req.file as
    | { mimetype: string; size: number; buffer: Uint8Array; originalname: string }
    | undefined;
  sendOk(res, await englishService.createSpeakingAttempt(userId, body, file), 201);
});

/** S_E2: GET /english/listening/:resourceId — metadata + playbackSpeedOptions. */
export const getListeningResource = asyncHandler(async (req, res) => {
  requireAuthContext(req);
  const { resourceId } = listeningResourceParamSchema.parse(req.params);
  sendOk(res, await englishService.getListeningResource(resourceId));
});

export const englishController = {
  createSpeakingAttempt,
  getListeningResource,
};
