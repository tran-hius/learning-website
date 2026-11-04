/**
 * Badge definitions (TASK-006, G5) — định nghĩa tạm trong CODE theo task
 * ("badges định nghĩa tạm trong code/seed, không cần bảng riêng nếu chưa có").
 *
 * Schema ĐÃ có bảng Badge/UserBadge → service lazy-award (ghi UserBadge khi điều
 * kiện đạt lần đầu khi GET /progress/badges), còn điều kiện đánh giá bằng code
 * (BADGE_DEFS) — condition JSON trong DB chỉ là mô tả, không dùng để evaluate MVP.
 */

export type BadgeCondition =
  | { type: "XP_TOTAL"; threshold: number }
  | { type: "STREAK_LONGEST"; threshold: number }
  | { type: "LESSONS_COMPLETED"; threshold: number }
  | { type: "EXAMS_SUBMITTED"; threshold: number };

export type BadgeDef = {
  name: string;
  icon: string;
  description: string;
  condition: BadgeCondition;
};

export type BadgeStats = {
  totalXp: number;
  longestStreak: number;
  lessonsCompleted: number;
  examsSubmitted: number;
};

export const BADGE_DEFS: BadgeDef[] = [
  {
    name: "Bước đầu tiên",
    icon: "🌱",
    description: "Hoàn thành bài học đầu tiên",
    condition: { type: "LESSONS_COMPLETED", threshold: 1 },
  },
  {
    name: "Học bền bỉ",
    icon: "🔥",
    description: "Streak 3 ngày liên tục",
    condition: { type: "STREAK_LONGEST", threshold: 3 },
  },
  {
    name: "Tuần vàng",
    icon: "🏅",
    description: "Streak 7 ngày liên tục",
    condition: { type: "STREAK_LONGEST", threshold: 7 },
  },
  {
    name: "Tri thức tập sự",
    icon: "⭐",
    description: "Đạt 200 XP",
    condition: { type: "XP_TOTAL", threshold: 200 },
  },
  {
    name: "Chiến binh phòng thi",
    icon: "📝",
    description: "Hoàn thành 5 bài thi",
    condition: { type: "EXAMS_SUBMITTED", threshold: 5 },
  },
];

/** Điều kiện 1 badge đã đạt chưa (pure). */
export function isBadgeEarned(def: BadgeDef, stats: BadgeStats): boolean {
  switch (def.condition.type) {
    case "XP_TOTAL":
      return stats.totalXp >= def.condition.threshold;
    case "STREAK_LONGEST":
      return stats.longestStreak >= def.condition.threshold;
    case "LESSONS_COMPLETED":
      return stats.lessonsCompleted >= def.condition.threshold;
    case "EXAMS_SUBMITTED":
      return stats.examsSubmitted >= def.condition.threshold;
    default:
      return false;
  }
}

/** Danh sách badge đạt / chưa đạt (pure — dùng cho G5). */
export function evaluateBadges(stats: BadgeStats): {
  earnedNames: string[];
  upcomingNames: string[];
} {
  const earnedNames: string[] = [];
  const upcomingNames: string[] = [];
  for (const def of BADGE_DEFS) {
    (isBadgeEarned(def, stats) ? earnedNames : upcomingNames).push(def.name);
  }
  return { earnedNames, upcomingNames };
}

/** Mô tả điều kiện dạng text (dùng cho G5 upcoming.condition). */
export function describeCondition(condition: BadgeCondition): string {
  switch (condition.type) {
    case "XP_TOTAL":
      return `Đạt ${condition.threshold} XP`;
    case "STREAK_LONGEST":
      return `Streak ${condition.threshold} ngày liên tục`;
    case "LESSONS_COMPLETED":
      return `Hoàn thành ${condition.threshold} bài học`;
    case "EXAMS_SUBMITTED":
      return `Hoàn thành ${condition.threshold} bài thi`;
    default:
      return "";
  }
}
