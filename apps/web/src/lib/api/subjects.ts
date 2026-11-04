import { apiFetch } from "./client";
import type {
  ChapterWithLessons,
  LessonBrief,
  LessonDetail,
  Paginated,
  SubjectDetail,
  SubjectListItem,
} from "./types";

/** S1 — Danh sách môn publish */
export function getSubjects(query?: { page?: number; limit?: number }): Promise<
  Paginated<SubjectListItem>
> {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiFetch(`/subjects${qs ? `?${qs}` : ""}`);
}

/** S2 — Chi tiết môn + chapters */
export function getSubjectBySlug(slug: string): Promise<SubjectDetail> {
  return apiFetch(`/subjects/${encodeURIComponent(slug)}`);
}

/** S3 — Chi tiết chương + danh sách bài */
export function getChapterLessons(
  slug: string,
  chapterId: string,
  query?: { page?: number; limit?: number },
): Promise<ChapterWithLessons> {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiFetch(
    `/subjects/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(chapterId)}${qs ? `?${qs}` : ""}`,
  );
}

/** S4 — Nội dung bài học (câu hỏi đã ẩn đáp án) */
export function getLesson(lessonId: string): Promise<LessonDetail> {
  return apiFetch(`/lessons/${encodeURIComponent(lessonId)}`);
}

/** S4 theo slug lookup (UI route /lessons/[slug]) — dùng id lấy nội dung */
export function getLessonBySlug(lessonIdOrSlug: string): Promise<LessonDetail> {
  return getLesson(lessonIdOrSlug);
}

/** L1 — Đánh dấu hoàn thành bài học */
export function completeLesson(lessonId: string): Promise<{ completedAt: string }> {
  return apiFetch(`/lessons/${encodeURIComponent(lessonId)}/complete`, {
    method: "POST",
    body: {},
  });
}

/** L2 — Gợi ý "học tiếp theo" */
export function getUpNext(): Promise<{ lesson?: LessonBrief; roadmap?: { id: string; title: string } }> {
  return apiFetch("/lessons/up-next");
}
