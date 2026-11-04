import type { Request, Response } from "express";
import { ProgressService } from "../services/progress.service";
import { sendOk } from "../utils/response";
import { AppError } from "../utils/errors";
import { asyncHandler } from "../utils/async-handler";
import {
  pomodoroSchema,
  timelineQuerySchema,
  streakCalendarQuerySchema,
} from "../validations";

/**
 * Progress controller — contract mục 6 (G1–G6), TASK-006.
 * Mọi endpoint requireAuth (STUDENT là chính — TEACHER/ADMIN xem được, D12).
 */
const progressService = new ProgressService();

function requireAuthContext(req: Request): string {
  if (!req.auth) {
    throw new AppError("AUTH_REQUIRED", "Authentication required", 401);
  }
  return req.auth.userId;
}

/** G1: GET /progress/overview — overview theo môn + streak + XP + level. */
export const getOverview = asyncHandler(async (req, res) => {
  const userId = requireAuthContext(req);
  sendOk(res, await progressService.getOverview(userId));
});

/** G2: GET /progress/weak-topics — accuracy < 0.7 + recommendedLesson. */
export const getWeakTopics = asyncHandler(async (req, res) => {
  const userId = requireAuthContext(req);
  sendOk(res, await progressService.getWeakTopics(userId));
});

/** G3: GET /progress/timeline?days=30 — biểu đồ theo ngày. */
export const getTimeline = asyncHandler(async (req, res) => {
  const userId = requireAuthContext(req);
  const { days } = timelineQuerySchema.parse(req.query);
  sendOk(res, await progressService.getTimeline(userId, days));
});

/** G4: GET /progress/streak-calendar?year=2026 — contributions GitHub-style. */
export const getStreakCalendar = asyncHandler(async (req, res) => {
  const userId = requireAuthContext(req);
  const { year } = streakCalendarQuerySchema.parse(req.query);
  sendOk(res, await progressService.getStreakCalendar(userId, year));
});

/** G5: GET /progress/badges — earned/upcoming (lazy-award vào UserBadge). */
export const getBadges = asyncHandler(async (req, res) => {
  const userId = requireAuthContext(req);
  sendOk(res, await progressService.getBadges(userId));
});

/** G6: POST /progress/pomodoro — ghi 1 chuỗi focus (D14: 25..60 phút, max 8/ngày). */
export const recordPomodoro = asyncHandler(async (req, res) => {
  const userId = requireAuthContext(req);
  const input = pomodoroSchema.parse(req.body);
  sendOk(res, await progressService.recordPomodoro(userId, input.minutes, input.completedAt), 201);
});

export const progressController = {
  getOverview,
  getWeakTopics,
  getTimeline,
  getStreakCalendar,
  getBadges,
  recordPomodoro,
};
