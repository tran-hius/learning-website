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

  // ── TASK-006 (G1–G6) ──────────────────────────────────────────────────
  /** XP + streak hiện tại của user (User.xp / User.longestStreak). */
  getUserStats(userId: string): Promise<{ xp: number; longestStreak: number } | null>;
  /** Toàn bộ lesson progress của user (G1 overview + G2 weak-topics). */
  listLessonProgress(userId: string): Promise<
    Array<{
      lessonId: string;
      completedAt: Date | null;
      accuracy: number | null;
      chapterId: string;
    }>
  >;
  /** Activity days (ngày UTC) cho streak/calendar: lesson completes + exam submits + pomodoros. */
  listActivityDays(
    userId: string,
    since?: Date,
  ): Promise<{ lessonDays: Date[]; examDays: Date[]; pomodoroDays: Date[] }>;
  /** G6: đếm số chuỗi pomodoro trong ngày UTC [dayStart, dayEnd). */
  countPomodorosBetween(userId: string, dayStart: Date, dayEnd: Date): Promise<number>;
  /** G6: ghi 1 chuỗi focus pomodoro. */
  createPomodoro(userId: string, minutes: number, completedAt: Date): Promise<void>;
  /** G5: badges user đã được award (lazy-award) + tìm badge theo name để upsert. */
  listUserBadges(userId: string): Promise<Array<{ name: string; earnedAt: Date }>>;
  awardBadgeByName(userId: string, badgeName: string, earnedAt: Date): Promise<void>;
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

  // ── TASK-006 (G1–G6) ──────────────────────────────────────────────────

  async getUserStats(userId: string) {
    return db.user.findUnique({
      where: { id: userId },
      select: { xp: true, longestStreak: true },
    });
  }

  async listLessonProgress(userId: string) {
    const rows = await db.userLessonProgress.findMany({
      where: { userId },
      select: {
        lessonId: true,
        completedAt: true,
        accuracy: true,
        lesson: { select: { chapterId: true } },
      },
    });
    return rows.map((r) => ({
      lessonId: r.lessonId,
      completedAt: r.completedAt,
      accuracy: r.accuracy,
      chapterId: r.lesson.chapterId,
    }));
  }

  async listActivityDays(userId: string, since?: Date) {
    const sinceClause = since ? { gte: since } : undefined;
    const [lessonRows, examRows, pomodoroRows] = await Promise.all([
      db.userLessonProgress.findMany({
        where: { userId, completedAt: sinceClause ?? { not: null } },
        select: { completedAt: true },
      }),
      db.examSession.findMany({
        where: { userId, submittedAt: sinceClause ?? { not: null } },
        select: { submittedAt: true },
      }),
      db.pomodoroSession.findMany({
        where: { userId, ...(sinceClause ? { completedAt: sinceClause } : {}) },
        select: { completedAt: true },
      }),
    ]);
    return {
      lessonDays: lessonRows.map((r) => r.completedAt as Date),
      examDays: examRows.map((r) => r.submittedAt as Date),
      pomodoroDays: pomodoroRows.map((r) => r.completedAt),
    };
  }

  async countPomodorosBetween(userId: string, dayStart: Date, dayEnd: Date) {
    return db.pomodoroSession.count({
      where: { userId, completedAt: { gte: dayStart, lt: dayEnd } },
    });
  }

  async createPomodoro(userId: string, minutes: number, completedAt: Date) {
    await db.pomodoroSession.create({
      data: { userId, minutes, completedAt },
      select: { id: true },
    });
  }

  async listUserBadges(userId: string) {
    const rows = await db.userBadge.findMany({
      where: { userId },
      select: { earnedAt: true, badge: { select: { name: true } } },
    });
    return rows.map((r) => ({ name: r.badge.name, earnedAt: r.earnedAt }));
  }

  async awardBadgeByName(userId: string, badgeName: string, earnedAt: Date) {
    const badge = await db.badge.findUnique({ where: { name: badgeName }, select: { id: true } });
    if (!badge) return; // badge chưa seed — bỏ qua (best-effort, D13)
    await db.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      update: {}, // đã có → giữ earnedAt cũ
      create: { userId, badgeId: badge.id, earnedAt },
    });
  }
}
