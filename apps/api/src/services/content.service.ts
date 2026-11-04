import { AppError } from "../utils/errors";
import { ContentRepository } from "../repositories";
import { ProgressRepository } from "../repositories/progress.repository";
import type { LessonFullRow } from "../repositories";
import { cacheGet, cacheSet } from "../utils/cache";
import { serializeQuestionsForStudent } from "../utils/question-serializer";

/**
 * Content service — contract mục 3.2 (S1–S4, L1–L2), TASK-003.
 * S1 dùng Redis cache 5 phút (best-effort — Redis vắng mặt thì skip, xem utils/cache).
 */

const SUBJECTS_CACHE_KEY = "subjects:list:v1";
const SUBJECTS_CACHE_TTL_SEC = 5 * 60;

/** XP +10 mỗi bài hoàn thành (contract mục 6). */
export const LESSON_COMPLETE_XP = 10;

export class ContentService {
  constructor(
    private readonly content: ContentRepository = new ContentRepository(),
    private readonly progress: ProgressRepository = new ProgressRepository(),
  ) {}

  /** S1: GET /subjects 🔓 — list môn + chapterCount (cache 5 phút nếu Redis sẵn sàng). */
  async listSubjects() {
    const cached = await cacheGet<{ items: unknown[] }>(SUBJECTS_CACHE_KEY);
    if (cached) return cached;
    const subjects = await this.content.listSubjectsWithChapterCount();
    const result = {
      items: subjects.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        icon: s.icon,
        color: s.color,
        chapterCount: s._count.chapters,
      })),
    };
    await cacheSet(SUBJECTS_CACHE_KEY, result, SUBJECTS_CACHE_TTL_SEC);
    return result;
  }

  /** S2: GET /subjects/:slug 🔓 — chi tiết môn + chapters (id/title/order). */
  async getSubjectBySlug(slug: string) {
    const subject = await this.content.findSubjectBySlug(slug);
    if (!subject) throw new AppError("NOT_FOUND", "Subject not found", 404);
    return { subject };
  }

  /**
   * S3: GET /subjects/:slug/chapters/:chapterId — chi tiết chương + list lesson
   * kèm `completed` theo user đăng nhập.
   */
  async getChapter(subjectSlug: string, chapterId: string, userId: string) {
    const chapter = await this.content.findChapterById(chapterId);
    if (!chapter || chapter.subject.slug !== subjectSlug) {
      throw new AppError("NOT_FOUND", "Chapter not found", 404);
    }
    const lessons = await this.content.listPublishedLessonsByChapter(chapterId);
    const completedIds = await this.progress.listCompletedLessonIds(
      userId,
      lessons.map((l) => l.id),
    );
    const completedSet = new Set(completedIds);
    return {
      chapter: { id: chapter.id, title: chapter.title, order: chapter.order },
      subject: { slug: chapter.subject.slug, name: chapter.subject.name },
      items: lessons.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        estimatedMinutes: l.estimatedMinutes,
        completed: completedSet.has(l.id),
      })),
    };
  }

  /**
   * S4: GET /lessons/:lessonId — nội dung bài (Markdown) + media + practiceSets
   * với câu hỏi ĐÃ ẨN đáp án (serialize không trả answer/explanation/thinkingHints[1..]).
   */
  async getLesson(lessonId: string) {
    const lesson = await this.content.findLessonById(lessonId);
    if (!lesson || lesson.status !== "PUBLISHED") {
      throw new AppError("NOT_FOUND", "Lesson not found", 404);
    }
    return this.toLessonPayload(lesson);
  }

  /** L1: POST /lessons/:lessonId/complete — ghi progress + XP +10 (idempotent). */
  async completeLesson(userId: string, lessonId: string) {
    const lesson = await this.content.findLessonById(lessonId);
    if (!lesson || lesson.status !== "PUBLISHED") {
      throw new AppError("NOT_FOUND", "Lesson not found", 404);
    }
    const { completedAt, alreadyCompleted } = await this.progress.completeLesson(userId, lessonId);
    if (!alreadyCompleted) {
      await this.progress.addXp(userId, LESSON_COMPLETE_XP);
    }
    return { completedAt };
  }

  /**
   * L2: GET /lessons/up-next — bài chưa hoàn thành kế tiếp trong chương đang học
   * (theo lần tương tác gần nhất của user). Fallback: bài publish đầu tiên của khoá học.
   */
  async upNext(userId: string): Promise<{ lesson: LessonBrief | null; roadmap: { id: string; title: string } | null }> {
    const latest = await this.progress.findLatestForUser(userId);
    if (latest) {
      const { lesson } = latest;
      // Bài kế tiếp theo order trong cùng chương đang học.
      const next = await this.content.findFirstPublishedLessonAfter(lesson.chapterId, lesson.order);
      if (next) {
        const chapter = await this.content.findChapterById(lesson.chapterId);
        return {
          lesson: {
            id: next.id,
            slug: next.slug,
            title: next.title,
            estimatedMinutes: next.estimatedMinutes,
            chapterTitle: chapter?.title ?? null,
            subjectSlug: chapter?.subject.slug ?? null,
            subjectName: chapter?.subject.name ?? null,
          },
          roadmap: null,
        };
      }
    }
    // Fallback: chưa học gì (hoặc hết chương) → bài publish đầu tiên của khoá học.
    const fallback = await this.content.findFirstPublishedLesson();
    if (!fallback) return { lesson: null, roadmap: null };
    return {
      lesson: {
        id: fallback.id,
        slug: fallback.slug,
        title: fallback.title,
        estimatedMinutes: fallback.estimatedMinutes,
        chapterTitle: fallback.chapter.title,
        subjectSlug: fallback.chapter.subject.slug,
        subjectName: fallback.chapter.subject.name,
      },
      roadmap: null,
    };
  }

  private toLessonPayload(lesson: LessonFullRow) {
    return {
      lesson: {
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        content: lesson.content,
        media: lesson.media,
        estimatedMinutes: lesson.estimatedMinutes,
        thinkingSection: lesson.thinkingSection,
        order: lesson.order,
        chapter: {
          id: lesson.chapter.id,
          title: lesson.chapter.title,
        },
        subject: {
          id: lesson.chapter.subject.id,
          slug: lesson.chapter.subject.slug,
          name: lesson.chapter.subject.name,
        },
      },
      practiceSets: lesson.practiceSets.map((set) => ({
        id: set.id,
        mode: set.mode,
        payload: set.payload,
        order: set.order,
        // BẮT BUỘC: câu hỏi ẩn đáp án khi làm bài (contract mục 3.2).
        questions: serializeQuestionsForStudent(set.questions),
      })),
    };
  }
}

export interface LessonBrief {
  id: string;
  slug: string;
  title: string;
  estimatedMinutes: number;
  chapterTitle: string | null;
  subjectSlug: string | null;
  subjectName: string | null;
}
