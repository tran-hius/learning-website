import { describe, expect, it } from "vitest";
import {
  POMODORO_MIN_MINUTES,
  POMODORO_MAX_MINUTES,
  POMODORO_MAX_SESSIONS_PER_DAY,
  POMODORO_XP_PER_SESSION,
  resolveCompletedAt,
  utcDayStart,
  isPomodoroQuotaExceeded,
} from "../../src/utils/pomodoro";

/**
 * TASK-006 (G6/D14): pomodoro 25..60 phút, +5 XP/chuỗi, max 8 chuỗi/ngày
 * (count theo ngày UTC — server-side guard chống spam XP).
 */
describe("pomodoro constants & helpers (G6/D14)", () => {
  it("đúng quyết định D14: [25..60] phút, +5 XP, max 8 chuỗi/ngày", () => {
    expect(POMODORO_MIN_MINUTES).toBe(25);
    expect(POMODORO_MAX_MINUTES).toBe(60);
    expect(POMODORO_XP_PER_SESSION).toBe(5);
    expect(POMODORO_MAX_SESSIONS_PER_DAY).toBe(8);
  });

  it("resolveCompletedAt: hợp lệ (trong 24h quay lại) → dùng; tương lai/quá cũ → now", () => {
    const now = new Date("2026-11-05T12:00:00.000Z");
    expect(resolveCompletedAt("2026-11-05T11:00:00.000Z", now).toISOString()).toBe(
      "2026-11-05T11:00:00.000Z",
    );
    // tương lai → clamp về now
    expect(resolveCompletedAt("2026-11-05T13:00:00.000Z", now).toISOString()).toBe(now.toISOString());
    // quá 24h → clamp về now (chống spam khai mốc ngày cũ)
    expect(resolveCompletedAt("2026-11-03T00:00:00.000Z", now).toISOString()).toBe(now.toISOString());
    // ISO không hợp lệ → now
    expect(resolveCompletedAt("not-a-date", now).toISOString()).toBe(now.toISOString());
    // không gửi → now
    expect(resolveCompletedAt(undefined, now).toISOString()).toBe(now.toISOString());
  });

  it("utcDayStart: đầu ngày UTC của completedAt (giờ biên 00:00 vs 23:59 khác ngày)", () => {
    expect(utcDayStart(new Date("2026-11-05T23:59:00.000Z")).toISOString()).toBe(
      "2026-11-05T00:00:00.000Z",
    );
    expect(utcDayStart(new Date("2026-11-05T00:00:00.000Z")).toISOString()).toBe(
      "2026-11-05T00:00:00.000Z",
    );
  });

  // TASK-007 (F2): create-then-count — count da bao gom session vua tao.
  it("isPomodoroQuotaExceeded: count sau khi tao > MAX moi vuot (dung 8 van cho phep)", () => {
    expect(isPomodoroQuotaExceeded(POMODORO_MAX_SESSIONS_PER_DAY)).toBe(false);
    expect(isPomodoroQuotaExceeded(POMODORO_MAX_SESSIONS_PER_DAY + 1)).toBe(true);
    expect(isPomodoroQuotaExceeded(1)).toBe(false);
  });
});
