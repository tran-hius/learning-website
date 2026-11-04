import { apiFetch } from "./client";
import type {
  Enrollment,
  Paginated,
  PlacementResult,
  RoadmapDetail,
  RoadmapListItem,
  RoadmapProgress,
} from "./types";

/** R1 — Danh sách lộ trình nghề nghiệp */
export function getRoadmaps(query?: {
  page?: number;
  limit?: number;
}): Promise<Paginated<RoadmapListItem>> {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiFetch(`/roadmaps${qs ? `?${qs}` : ""}`);
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

/** R4 — Tiến độ lộ trình của mình (milestone mở theo dependencies) */
export function getMyRoadmapProgress(enrollmentId: string): Promise<RoadmapProgress> {
  return apiFetch(`/roadmaps/me/${encodeURIComponent(enrollmentId)}`);
}

/** R5 — Test đầu vào (alias POST /exams kind PLACEMENT_TEST) */
export function startPlacementTest(subjectSlug?: string): Promise<PlacementResult> {
  return apiFetch("/progress/placement-test", {
    method: "POST",
    body: { kind: "PLACEMENT_TEST", subjectSlug },
  });
}
