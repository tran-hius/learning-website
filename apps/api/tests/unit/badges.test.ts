import { describe, expect, it } from "vitest";
import { BADGE_DEFS, isBadgeEarned, evaluateBadges, describeCondition } from "../../src/utils/badges";

/** TASK-006 (G5): badge conditions evaluate bằng code (pure). */
describe("badges (G5)", () => {
  const base = { totalXp: 0, longestStreak: 0, lessonsCompleted: 0, examsSubmitted: 0 };

  it("XP badge: đạt/chưa đạt đúng ngưỡng", () => {
    const def = BADGE_DEFS.find((d) => d.condition.type === "XP_TOTAL")!;
    expect(isBadgeEarned(def, { ...base, totalXp: 199 })).toBe(false);
    expect(isBadgeEarned(def, { ...base, totalXp: 200 })).toBe(true);
  });

  it("streak badge theo longestStreak", () => {
    const def = BADGE_DEFS.find((d) => d.condition.type === "STREAK_LONGEST" && d.condition.threshold === 3)!;
    expect(isBadgeEarned(def, { ...base, longestStreak: 3 })).toBe(true);
    expect(isBadgeEarned(def, { ...base, longestStreak: 2 })).toBe(false);
  });

  it("evaluateBadges: chia đúng earned/upcoming", () => {
    const { earnedNames, upcomingNames } = evaluateBadges({
      totalXp: 250,
      longestStreak: 4,
      lessonsCompleted: 1,
      examsSubmitted: 0,
    });
    expect(earnedNames).toContain("Bước đầu tiên");
    expect(earnedNames).toContain("Học bền bỉ");
    expect(earnedNames).toContain("Tri thức tập sự");
    expect(upcomingNames).toContain("Tuần vàng");
    expect(upcomingNames).toContain("Chiến binh phòng thi");
    expect(earnedNames.length + upcomingNames.length).toBe(BADGE_DEFS.length);
  });

  it("describeCondition trả text dễ đọc", () => {
    expect(describeCondition({ type: "XP_TOTAL", threshold: 200 })).toContain("200");
  });
});
