import type { Request, Response } from "express";
import { PracticeService } from "../services/practice.service";
import { sendOk } from "../utils/response";
import { AppError } from "../utils/errors";
import { asyncHandler } from "../utils/async-handler";
import {
  practiceAttemptSchema,
  hintBodySchema,
  pythonExecSchema,
  questionIdParamSchema,
  practiceSetIdParamSchema,
} from "../validations";

/**
 * Practice controller — contract mục 4 (P1–P3), TASK-004.
 * Mọi endpoint requireAuth; role chính là STUDENT (TEACHER/ADMIN cũng được — D12).
 */
const practiceService = new PracticeService();

function requireAuthContext(req: Request): string {
  if (!req.auth) {
    throw new AppError("AUTH_REQUIRED", "Authentication required", 401);
  }
  return req.auth.userId;
}

/** P1: POST /practice/:setId/attempt — chấm server-side, trả đáp án + XP. */
export const submitPracticeAttempt = asyncHandler(async (req, res) => {
  const userId = requireAuthContext(req);
  const { setId } = practiceSetIdParamSchema.parse(req.params);
  const input = practiceAttemptSchema.parse(req.body);
  sendOk(res, await practiceService.submitAttempt(userId, setId, input));
});

/** P2: POST /practice/hints/:questionId — gợi ý bậc 1|2. */
export const getHint = asyncHandler(async (req, res) => {
  requireAuthContext(req);
  const { questionId } = questionIdParamSchema.parse(req.params);
  const input = hintBodySchema.parse(req.body);
  sendOk(res, await practiceService.getHint(questionId, input));
});

/** P3: POST /python/exec — proxy Piston, rate limit 10/phút/user. */
export const execPython = asyncHandler(async (req, res) => {
  const userId = requireAuthContext(req);
  const input = pythonExecSchema.parse(req.body);
  sendOk(res, await practiceService.execPython(userId, input));
});

export const practiceController = {
  submitPracticeAttempt,
  getHint,
  execPython,
};
