/**
 * Pomodoro helpers (TASK-006, D14 / G6) — PURE functions.
 *
 * GIẢ ĐỊNH: "1 ngày" đếm theo ngày UTC (task ghi "ngày local UTC đơn giản").
 * completedAt client gửi lên phải nằm trong 24 giờ quay lại (chống spam XP bằng
 * cách tự khai mốc ngày cũ) — quá 24h hoặc tương lai → server dùng `now`.
 *
 * TASK-007: constants là contract (mục 6/D14) → nguồn chân lý ở `@learning/shared`,
 * re-export tại đây để giữ import cũ.
 */
export {
  POMODORO_MIN_MINUTES,
  POMODORO_MAX_MINUTES,
  POMODORO_MAX_SESSIONS_PER_DAY,
  POMODORO_XP_PER_SESSION,
} from "@learning/shared";

import { POMODORO_MAX_SESSIONS_PER_DAY } from "@learning/shared";

/** completedAt hợp lệ (không tương lai, không cũ hơn 24h) → dùng; ngược lại → now. */
export function resolveCompletedAt(input: string | undefined, now: Date): Date {
  if (!input) return now;
  const d = new Date(input);
  const valid = !Number.isNaN(d.getTime()) && d.getTime() <= now.getTime() && now.getTime() - d.getTime() <= 86_400_000;
  return valid ? d : now;
}

/** Điểm bắt đầu ngày UTC chứa `date` (dùng cho query count theo ngày). */
export function utcDayStart(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

/**
 * F2 (TASK-007): trong transaction, tạo pomodoro TRƯỚC rồi mới count —
 * count bao gồm chính session vừa tạo → vượt quota khi `count > MAX`.
 */
export function isPomodoroQuotaExceeded(countAfterCreate: number): boolean {
  return countAfterCreate > POMODORO_MAX_SESSIONS_PER_DAY;
}
