import type { Request, Response } from "express";
import { RoadmapService } from "../services/roadmap.service";
import { sendOk } from "../utils/response";
import { AppError } from "../utils/errors";
import { asyncHandler } from "../utils/async-handler";
import {
  roadmapSlugParamSchema,
  roadmapIdParamSchema,
  enrollmentIdParamSchema,
  placementTestSchema,
} from "../validations";

/**
 * Roadmap controller — contract mục 7 (R1–R5), TASK-006.
 * R1/R2 🔓 public; R3/R4 requireAuth; R5 alias POST /exams (requireAuth).
 */
const roadmapService = new RoadmapService();

function requireAuthContext(req: Request): string {
  if (!req.auth) {
    throw new AppError("AUTH_REQUIRED", "Authentication required", 401);
  }
  return req.auth.userId;
}

/** R1: GET /roadmaps 🔓. */
export const listRoadmaps = asyncHandler(async (_req, res) => {
  sendOk(res, await roadmapService.listRoadmaps());
});

/** R2: GET /roadmaps/:slug 🔓 — tree milestones. */
export const getRoadmap = asyncHandler(async (req, res) => {
  const { slug } = roadmapSlugParamSchema.parse(req.params);
  sendOk(res, await roadmapService.getRoadmapBySlug(slug));
});

/** R3: POST /roadmaps/:id/enroll — bắt đầu lộ trình (idempotent). */
export const enrollRoadmap = asyncHandler(async (req, res) => {
  const userId = requireAuthContext(req);
  const { id } = roadmapIdParamSchema.parse(req.params);
  sendOk(res, await roadmapService.enroll(userId, id), 201);
});

/** R4: GET /roadmaps/me/:enrollmentId — tiến độ + milestone unlock theo dependencies. */
export const getMyRoadmapProgress = asyncHandler(async (req, res) => {
  const userId = requireAuthContext(req);
  const { enrollmentId } = enrollmentIdParamSchema.parse(req.params);
  sendOk(res, await roadmapService.getMyProgress(userId, enrollmentId));
});

/** R5: POST /progress/placement-test — alias POST /exams kind PLACEMENT_TEST + gợi lộ trình. */
export const startPlacementTest = asyncHandler(async (req, res) => {
  const userId = requireAuthContext(req);
  const input = placementTestSchema.parse(req.body);
  sendOk(res, await roadmapService.startPlacementTest(userId, input), 201);
});

export const roadmapController = {
  listRoadmaps,
  getRoadmap,
  enrollRoadmap,
  getMyRoadmapProgress,
  startPlacementTest,
};
