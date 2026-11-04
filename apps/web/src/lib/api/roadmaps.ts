import { apiFetch } from "./client";
import type {
  Enrollment,
  EnrollmentListItem,
  PlacementResult,
  RoadmapDetail,
  RoadmapListItem,
  RoadmapProgress,
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

/**
 * TASK-007 — enrollments của user (GET /roadmaps/me): thay localStorage làm
 * nguồn tìm enrollmentId khi vào R4. API lỗi → FE fallback localStorage (trung thực).
 */
export function getMyEnrollments(): Promise<EnrollmentListItem[]> {
  return apiFetch("/roadmaps/me");
}

/** R4 — Tiến độ lộ trình của mình (milestone mở theo dependencies).
 * v1.1: shape thật đã đồng bộ vào shared `RoadmapProgress` (MilestoneStatus enum). */
export function getMyRoadmapProgress(enrollmentId: string): Promise<RoadmapProgress> {
  return apiFetch(`/roadmaps/me/${encodeURIComponent(enrollmentId)}`);
}

/** R5 — Test đầu vào (alias POST /progress/placement-test).
 * v1.1: dùng shared `PlacementResult` (session + recommendedRoadmap + confidence). */
export function startPlacementTest(subjectSlug?: string): Promise<PlacementResult> {
  return apiFetch("/progress/placement-test", {
    method: "POST",
    body: { kind: "PLACEMENT_TEST", subjectSlug },
  });
}
