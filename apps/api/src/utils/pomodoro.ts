/**
 * Pomodoro constants + helpers (TASK-006, D14 / G6) — PURE functions.
 *
 * GIẢ ĐỊNH: "1 ngày" đếm theo ngày UTC (task ghi "ngày local UTC đơn giản").
 * completedAt client gửi lên phải nằm trong 24 giờ quay lại (chống spam XP bằng
 * cách tự khai mốc ngày cũ) — quá 24h hoặc tương lai → server dùng `now`.
 */
export const POMODORO_MIN_MINUTES = 25;
export const POMODORO_MAX_MINUTES = 60;
export const POMODORO_MAX_SESSIONS_PER_DAY = 8;
export const POMODORO_XP_PER_SESSION = 5;

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
