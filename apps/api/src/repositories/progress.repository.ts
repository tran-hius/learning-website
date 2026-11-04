import { db } from "../utils/db";

/**
 * Progress repository — UserLessonProgress + XP (L1/L2, TASK-003).
 */

export type LessonProgressRow = {
  id: string;
  lessonId: string;
  completedAt: Date | null;
  lastViewedAt: Date;
};

export interface IProgressRepository {
  /** Danh sách lessonId đã hoàn thành trong một tập id (S3: flag `completed`). */
  listCompletedLessonIds(userId: string, lessonIds: string[]): Promise<string[]>;
  /**
   * Upsert tiến độ hoàn thành. Trả `alreadyCompleted` để service biết có cộng XP hay không
   * (hoàn thành lại 1 bài đã xong thì KHÔNG cộng XP lần 2).
   */
  completeLesson(userId: string, lessonId: string): Promise<{ completedAt: Date; alreadyCompleted: boolean }>;
  /** Bài học user tương tác gần nhất (L2: up-next theo lộ trình đang học). */
  findLatestForUser(userId: string): Promise<
    | (LessonProgressRow & {
        lesson: { id: string; order: number; chapterId: string };
      })
    | null
  >;
  /** +XP cho user (L1: +10/bài) — cập nhật luôn lastActiveAt cho streak. */
  addXp(userId: string, amount: number): Promise<void>;
}

export class ProgressRepository implements IProgressRepository {
  async listCompletedLessonIds(userId: string, lessonIds: string[]): Promise<string[]> {
    if (lessonIds.length === 0) return [];
    const rows = await db.userLessonProgress.findMany({
      where: { userId, lessonId: { in: lessonIds }, completedAt: { not: null } },
      select: { lessonId: true },
    });
    return rows.map((r) => r.lessonId);
  }

  async completeLesson(userId: string, lessonId: string) {
    const now = new Date();
    const existing = await db.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { id: true, completedAt: true },
    });
    if (!existing) {
      const row = await db.userLessonProgress.create({
        data: { userId, lessonId, completedAt: now, lastViewedAt: now },
        select: { completedAt: true },
      });
      return { completedAt: row.completedAt ?? now, alreadyCompleted: false };
    }
    if (!existing.completedAt) {
      // Xem trước đó nhưng chưa hoàn thành → đánh dấu lần đầu, được cộng XP.
      await db.userLessonProgress.update({
        where: { id: existing.id },
        data: { completedAt: now, lastViewedAt: now },
      });
      return { completedAt: now, alreadyCompleted: false };
    }
    // Đã hoàn thành trước đó → chỉ cập nhật lastViewedAt, KHÔNG cộng XP lần 2.
    await db.userLessonProgress.update({
      where: { id: existing.id },
      data: { lastViewedAt: now },
    });
    return { completedAt: existing.completedAt, alreadyCompleted: true };
  }

  async findLatestForUser(userId: string) {
    return db.userLessonProgress.findFirst({
      where: { userId },
      orderBy: { lastViewedAt: "desc" },
      select: {
        id: true,
        lessonId: true,
        completedAt: true,
        lastViewedAt: true,
        lesson: { select: { id: true, order: true, chapterId: true } },
      },
    });
  }

  async addXp(userId: string, amount: number): Promise<void> {
    await db.user.update({
      where: { id: userId },
      data: { xp: { increment: amount }, lastActiveAt: new Date() },
      select: { id: true },
    });
  }
}
