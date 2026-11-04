import { AppError } from "../utils/errors";
import { ProgressRepository } from "../repositories/progress.repository";
import { ContentRepository } from "../repositories/content.repository";
import {
  POMODORO_MIN_MINUTES,
  POMODORO_MAX_MINUTES,
  POMODORO_MAX_SESSIONS_PER_DAY,
  POMODORO_XP_PER_SESSION,
  resolveCompletedAt,
  utcDayStart,
} from "../utils/pomodoro";
import { computeStreaks, utcDayKey, lastNDayKeys } from "../utils/streak";
import { BADGE_DEFS, evaluateBadges, describeCondition } from "../utils/badges";
import { LESSON_COMPLETE_XP } from "./content.service";

/**
 * Progress service — contract mục 6 (G1–G6), TASK-006.
 *
 * GIẢ ĐỊNH MVP (ghi rõ báo cáo):
 * - "Ngày có hoạt động" derive từ 3 nguồn có sẵn trong schema: UserLessonProgress
 *   (hoàn thành bài), ExamSession (nộp thi), PomodoroSession (G6). Practice attempt
 *   (P1) không có bảng lưu trong schema nên không tính vào streak/calendar.
 * - G3 timeline `xpEarned` per-day: schema KHÔNG có bảng XP ledger nên chỉ tính được
 *   XP suy ra trực tiếp từ sự kiện: lesson hoàn thành ×10 (LESSON_COMPLETE_XP) +
 *   pomodoro ×5. XP exam (+5/câu đúng) không suy ngược được per-day → không tính.
 * - G2 weak-topics: topic = bài học user có accuracy < 0.7 (accuracy lưu tại
 *   UserLessonProgress từ TASK-003/004); `attempts` = 1 vì schema chỉ lưu accuracy
 *   mới nhất/bài, không có lịch sử attempt.
 * - G4 count = số sự kiện hoạt động trong ngày (lesson + exam + pomodoro).
 * - G5 badge: điều kiện evaluate bằng code (utils/badges), lazy-award ghi UserBadge
 *   lần đầu đạt (schema có sẵn Badge/UserBadge).
 */
export class ProgressService {
  constructor(
    private readonly progress: ProgressRepository = new ProgressRepository(),
    private readonly content: ContentRepository = new ContentRepository(),
  ) {}

  // ── G1: GET /progress/overview ──────────────────────────────────────

  async getOverview(userId: string) {
    const [user, subjects, progressRows, activity] = await Promise.all([
      this.progress.getUserStats(userId),
      this.content.listSubjectTree(),
      this.progress.listLessonProgress(userId),
      this.progress.listActivityDays(userId),
    ]);
    if (!user) throw new AppError("NOT_FOUND", "User not found", 404);

    const completedByLesson = new Set(
      progressRows.filter((r) => r.completedAt).map((r) => r.lessonId),
    );
    const accuracyByLesson = new Map(
      progressRows
        .filter((r) => r.accuracy !== null)
        .map((r) => [r.lessonId, r.accuracy as number]),
    );

    const subjectsOut = subjects.map((s) => {
      const publishedLessons = s.chapters
        .flatMap((c) => c.lessons)
        .filter((l) => l.status === "PUBLISHED");
      const completed = publishedLessons.filter((l) => completedByLesson.has(l.id));
      const subjectAccuracies = completed
        .map((l) => accuracyByLesson.get(l.id))
        .filter((a): a is number => typeof a === "number");
      const avgAccuracy =
        subjectAccuracies.length === 0
          ? 0
          : Math.round(
              (subjectAccuracies.reduce((sum, a) => sum + a, 0) / subjectAccuracies.length) * 1000,
            ) / 1000;
      return {
        subjectId: s.id,
        name: s.name,
        percentCompleted:
          publishedLessons.length === 0
            ? 0
            : Math.round((completed.length / publishedLessons.length) * 1000) / 10,
        avgAccuracy,
        chapters: s.chapters.map((c) => {
          const chLessons = c.lessons.filter((l) => l.status === "PUBLISHED");
          const chCompleted = chLessons.filter((l) => completedByLesson.has(l.id));
          return {
            id: c.id,
            title: c.title,
            completed: chCompleted.length,
            total: chLessons.length,
          };
        }),
      };
    });

    const streak = computeStreaks(activityDaysToKeys(activity), utcDayKey(new Date()));
    return {
      subjects: subjectsOut,
      currentStreak: streak.current,
      longestStreak: streak.longest,
      totalXp: user.xp,
      level: Math.floor(user.xp / 100),
    };
  }

  // ── G2: GET /progress/weak-topics ───────────────────────────────────

  async getWeakTopics(userId: string) {
    const rows = await this.progress.listLessonProgress(userId);
    const weak = rows.filter((r) => r.accuracy !== null && (r.accuracy as number) < 0.7);
    if (weak.length === 0) return { items: [] };
    const lessons = await this.content.findLessonsByIds(weak.map((r) => r.lessonId));
    const byId = new Map(lessons.map((l) => [l.id, l]));
    const items = weak
      .map((r) => {
        const lesson = byId.get(r.lessonId);
        return {
          topic: lesson?.title ?? r.lessonId,
          accuracy: r.accuracy as number,
          attempts: 1, // giả định: schema không lưu lịch sử attempt
          recommendedLesson: lesson ? { id: lesson.id, title: lesson.title } : null,
        };
      })
      .sort((a, b) => a.accuracy - b.accuracy);
    return { items };
  }

  // ── G3: GET /progress/timeline?days=30 ──────────────────────────────

  async getTimeline(userId: string, days: number) {
    const since = new Date(Date.now() - (days - 1) * 86_400_000);
    since.setUTCHours(0, 0, 0, 0);
    const activity = await this.progress.listActivityDays(userId, since);

    const byDay = new Map<string, { lessonsCompleted: number; examsTaken: number; xpEarned: number }>();
    for (const key of lastNDayKeys(utcDayKey(new Date()), days)) {
      byDay.set(key, { lessonsCompleted: 0, examsTaken: 0, xpEarned: 0 });
    }
    for (const d of activity.lessonDays) {
      const entry = byDay.get(utcDayKey(d));
      if (entry) {
        entry.lessonsCompleted++;
        entry.xpEarned += LESSON_COMPLETE_XP;
      }
    }
    for (const d of activity.examDays) {
      const entry = byDay.get(utcDayKey(d));
      if (entry) entry.examsTaken++; // XP exam per-day không suy ngược được (giả định)
    }
    for (const d of activity.pomodoroDays) {
      const entry = byDay.get(utcDayKey(d));
      if (entry) entry.xpEarned += POMODORO_XP_PER_SESSION;
    }
    return {
      items: [...byDay.entries()].map(([date, v]) => ({ date, ...v })),
    };
  }

  // ── G4: GET /progress/streak-calendar?year=2026 ─────────────────────

  async getStreakCalendar(userId: string, year: number) {
    const since = new Date(`${year}-01-01T00:00:00.000Z`);
    const until = new Date(`${year + 1}-01-01T00:00:00.000Z`);
    const activity = await this.progress.listActivityDays(userId, since);
    const counts = new Map<string, number>();
    const add = (dates: Date[]) => {
      for (const d of dates) {
        const key = utcDayKey(d);
        if (key >= utcDayKey(since) && key < utcDayKey(until)) {
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
    };
    add(activity.lessonDays);
    add(activity.examDays);
    add(activity.pomodoroDays);
    const days = [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
    return { days };
  }

  // ── G5: GET /progress/badges ────────────────────────────────────────

  async getBadges(userId: string) {
    const [user, progressRows, activity, existingBadges] = await Promise.all([
      this.progress.getUserStats(userId),
      this.progress.listLessonProgress(userId),
      this.progress.listActivityDays(userId),
      this.progress.listUserBadges(userId),
    ]);
    if (!user) throw new AppError("NOT_FOUND", "User not found", 404);
    const streak = computeStreaks(activityDaysToKeys(activity), utcDayKey(new Date()));
    const stats = {
      totalXp: user.xp,
      longestStreak: Math.max(streak.longest, user.longestStreak),
      lessonsCompleted: progressRows.filter((r) => r.completedAt).length,
      examsSubmitted: activity.examDays.length,
    };
    const { earnedNames, upcomingNames } = evaluateBadges(stats);

    // Lazy-award: ghi UserBadge lần đầu điều kiện đạt (schema có Badge/UserBadge).
    const existingByName = new Map(existingBadges.map((b) => [b.name, b.earnedAt]));
    const now = new Date();
    for (const name of earnedNames) {
      if (!existingByName.has(name)) {
        await this.progress.awardBadgeByName(userId, name, now);
        existingByName.set(name, now);
      }
    }

    return {
      earned: BADGE_DEFS.filter((d) => earnedNames.includes(d.name)).map((d) => ({
        id: d.name,
        name: d.name,
        icon: d.icon,
        earnedAt: (existingByName.get(d.name) ?? now).toISOString(),
      })),
      upcoming: BADGE_DEFS.filter((d) => upcomingNames.includes(d.name)).map((d) => ({
        id: d.name,
        name: d.name,
        icon: d.icon,
        condition: describeCondition(d.condition),
      })),
    };
  }

  // ── G6: POST /progress/pomodoro (D14) ───────────────────────────────

  async recordPomodoro(userId: string, minutes: number, completedAtInput?: string) {
    // validate minutes ∈ [25..60] (D14: chuỗi focus ≥25 phút mới tính XP).
    if (
      !Number.isInteger(minutes) ||
      minutes < POMODORO_MIN_MINUTES ||
      minutes > POMODORO_MAX_MINUTES
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        `minutes must be an integer between ${POMODORO_MIN_MINUTES} and ${POMODORO_MAX_MINUTES}`,
        422,
      );
    }
    const now = new Date();
    const completedAt = resolveCompletedAt(completedAtInput, now);
    const dayStart = utcDayStart(completedAt);
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);

    // Chống spam XP: tối đa 8 chuỗi/ngày/user (đếm theo ngày UTC — giả định task).
    const countToday = await this.progress.countPomodorosBetween(userId, dayStart, dayEnd);
    if (countToday >= POMODORO_MAX_SESSIONS_PER_DAY) {
      throw new AppError(
        "RATE_LIMITED",
        `Pomodoro XP limit reached: max ${POMODORO_MAX_SESSIONS_PER_DAY} sessions per day`,
        429,
      );
    }

    await this.progress.createPomodoro(userId, minutes, completedAt);
    await this.progress.addXp(userId, POMODORO_XP_PER_SESSION);
    return { xpEarned: POMODORO_XP_PER_SESSION, sessionsToday: countToday + 1 };
  }
}

/** Helper: gộp activity days → Set key ngày UTC. */
function activityDaysToKeys(activity: {
  lessonDays: Date[];
  examDays: Date[];
  pomodoroDays: Date[];
}): Set<string> {
  const keys = new Set<string>();
  for (const d of [...activity.lessonDays, ...activity.examDays, ...activity.pomodoroDays]) {
    keys.add(utcDayKey(d));
  }
  return keys;
}
