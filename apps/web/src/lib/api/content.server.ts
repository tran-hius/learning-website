/**
 * Hàm fetch content chạy trong Server Component (forward cookie phiên).
 * Mỗi hàm trả null khi API lỗi/chưa chạy → trang chuyển chế độ demo,
 * KHÔNG tự chế data giả (chống "fake data như thật" theo task file).
 */
import { headers as nextHeaders } from "next/headers";
import { apiFetchServer } from "./client";
import type { QuestionPublic } from "./types";

/** Shape trả về thật của backend (content.service.ts) — khác shape cũ trong subjects.ts. */
export interface SubjectRow {
  id: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
  chapterCount: number;
  description?: string;
}

export interface SubjectChapter {
  id: string;
  title: string;
  order: number;
}

export interface SubjectDetailRow {
  subject: {
    id: string;
    slug: string;
    name: string;
    icon: string;
    color: string;
    description?: string;
  };
  chapters: SubjectChapter[];
}

export interface ChapterLessonsRow {
  chapter: { id: string; title: string; order: number };
  subject: { slug: string; name: string };
  items: Array<{
    id: string;
    slug: string;
    title: string;
    estimatedMinutes: number;
    completed: boolean;
  }>;
}

export interface LessonRow {
  lesson: {
    id: string;
    slug: string;
    title: string;
    content: string;
    media: Array<{ url: string; type: "IMAGE" | "AUDIO"; bytes?: number }>;
    estimatedMinutes: number;
    thinkingSection: string;
    order: number;
    chapter: { id: string; title: string };
    subject: { id: string; slug: string; name: string };
  };
  practiceSets: Array<{
    id: string;
    mode: string;
    payload: Record<string, unknown>;
    order: number;
    questions: QuestionPublic[];
  }>;
}

async function cookieHeader(): Promise<Record<string, string> | undefined> {
  const cookie = (await nextHeaders()).get("cookie") ?? "";
  return cookie ? { cookie } : undefined;
}

/** S1 — GET /subjects (unwrap `{ items }`). */
export async function getSubjectsServer(): Promise<SubjectRow[] | null> {
  try {
    const data = await apiFetchServer<{ items: SubjectRow[] }>("/subjects", {
      headers: await cookieHeader(),
    });
    return data.items;
  } catch {
    return null;
  }
}

/** S2 — GET /subjects/:slug (unwrap `{ subject, chapters }`). */
export async function getSubjectServer(slug: string): Promise<SubjectDetailRow | null> {
  try {
    return await apiFetchServer<SubjectDetailRow>(
      `/subjects/${encodeURIComponent(slug)}`,
      { headers: await cookieHeader() },
    );
  } catch {
    return null;
  }
}

/** S3 — GET /subjects/:slug/chapters/:chapterId (cần đăng nhập; lỗi → null). */
export async function getChapterLessonsServer(
  slug: string,
  chapterId: string,
): Promise<ChapterLessonsRow | null> {
  try {
    return await apiFetchServer<ChapterLessonsRow>(
      `/subjects/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(chapterId)}`,
      { headers: await cookieHeader() },
    );
  } catch {
    return null;
  }
}

/**
 * S4 — GET /lessons/:lessonId. LƯU Ý contract: endpoint nhận **lessonId**,
 * chưa có endpoint tra slug→id (đã ghi câu hỏi cho manager trong task file).
 * Thử truyền slug thẳng — nếu backend 404 thì trang rơi vào demo mode.
 */
export async function getLessonServer(idOrSlug: string): Promise<LessonRow | null> {
  try {
    return await apiFetchServer<LessonRow>(
      `/lessons/${encodeURIComponent(idOrSlug)}`,
      { headers: await cookieHeader() },
    );
  } catch {
    return null;
  }
}
