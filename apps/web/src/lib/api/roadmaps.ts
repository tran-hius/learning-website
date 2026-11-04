import { apiFetch } from "./client";
import type {
  Enrollment,
  RoadmapDetail,
  RoadmapListItem,
} from "./types";

/**
 * R1 — Danh sách lộ trình nghề nghiệp.
 * Backend (roadmap.service.listRoadmaps) trả `{ items }` KHÔNG phân trang —
 * shape Paginated<RoadmapListItem> trong shared là cũ, FE dùng shape thật.
 */
export function getRoadmaps(): Promise<{ items: RoadmapListItem[] }> {
  return apiFetch("/roadmaps");
}

/** R2 — Cây đầy đủ 1 lộ trình */
export function getRoadmapBySlug(slug: string): Promise<RoadmapDetail> {
  return apiFetch(`/roadmaps/${encodeURIComponent(slug)}`);
}

/** R3 — Bắt đầu lộ trình */
export function enrollRoadmap(roadmapId: string): Promise<{ enrollment: Enrollment }> {
  return apiFetch(`/roadmaps/${encodeURIComponent(roadmapId)}/enroll`, {
    method: "POST",
    body: {},
  });
}

/** R4 — Tiến độ lộ trình của mình (milestone mở theo dependencies).
 * Shape thật (roadmap.service.getMyProgress): có enrollment + milestones kèm title/order/status,
 * currentStep là MILESTONE ID (không phải number như shared) — dùng type cục bộ. */
export interface RoadmapProgressReal {
  enrollment: { id: string; roadmap: { id: string; slug: string; title: string }; startedAt: string };
  percentCompleted: number;
  currentStep: string | null;
  milestones: Array<{
    id: string;
    title: string;
    order: number;
    status: "LOCKED" | "AVAILABLE" | "DONE" | "SKIPPED";
  }>;
}

export function getMyRoadmapProgress(enrollmentId: string): Promise<RoadmapProgressReal> {
  return apiFetch(`/roadmaps/me/${encodeURIComponent(enrollmentId)}`);
}

/** R5 — Test đầu vào (alias POST /exams kind PLACEMENT_TEST).
 * Backend trả `{ session: {...}, recommendedRoadmap | null, confidence }` (roadmap.service). */
export interface PlacementResultReal {
  session: {
    id: string;
    durationSec: number;
    totalQuestions: number;
    startedAt: string;
    expiresAt: string;
    remainingSec: number;
  };
  recommendedRoadmap: { id: string; slug: string; title: string } | null;
  confidence: number;
}

export function startPlacementTest(subjectSlug?: string): Promise<PlacementResultReal> {
  return apiFetch("/progress/placement-test", {
    method: "POST",
    body: { kind: "PLACEMENT_TEST", subjectSlug },
  });
}
