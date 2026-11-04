/**
 * Streak logic (TASK-006, G1/G4) — PURE functions.
 *
 * GIẢ ĐỊNH (ghi vào báo cáo): "ngày có hoạt động" = có ít nhất 1 sự kiện trong
 * 3 nguồn khả dụng trong schema: UserLessonProgress.completedAt (hoàn thành bài),
 * ExamSession.submittedAt (nộp thi), PomodoroSession.completedAt (G6).
 * Practice attempt (P1) KHÔNG có bảng lưu trong schema nên không tính được — MVP.
 *
 * Ngày được chuẩn hoá theo UTC (YYYY-MM-DD) — đơn giản, nhất quán với G6
 * (ngày local UTC đơn giản theo ghi chú task).
 */

/** Chuẩn hoá 1 Date thành key ngày UTC "YYYY-MM-DD". */
export function utcDayKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

/** Key ngày UTC của "hôm nay" (được inject để test). */
export function todayUtcKey(now: Date): string {
  return utcDayKey(now);
}

/** Danh sách N ngày liên tục kết thúc tại `endKey` (bao gồm endKey), cũ → mới. */
export function lastNDayKeys(endKey: string, n: number): string[] {
  const end = new Date(`${endKey}T00:00:00.000Z`);
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(new Date(end.getTime() - i * 86_400_000).toISOString().slice(0, 10));
  }
  return days;
}

/**
 * Tính currentStreak & longestStreak từ tập ngày có hoạt động.
 * - current: chuỗi ngày liên tục kết thúc tại HÔM NAY hoặc HÔM QUA
 *   (hôm nay chưa hoạt động thì không phá chuỗi — pattern GitHub contributions).
 * - longest: chuỗi dài nhất từng đạt.
 */
export function computeStreaks(
  activeDays: Iterable<string>,
  todayKey: string,
): { current: number; longest: number } {
  const set = new Set(activeDays);
  if (set.size === 0) return { current: 0, longest: 0 };

  const yesterdayKey = new Date(
    new Date(`${todayKey}T00:00:00.000Z`).getTime() - 86_400_000,
  ).toISOString().slice(0, 10);

  // current: đuổi ngược từ today (hoặc yesterday nếu hôm nay chưa active).
  let current = 0;
  let cursor = set.has(todayKey) ? todayKey : yesterdayKey;
  while (set.has(cursor)) {
    current++;
    cursor = new Date(new Date(`${cursor}T00:00:00.000Z`).getTime() - 86_400_000)
      .toISOString()
      .slice(0, 10);
  }

  // longest: duyệt các ngày active đã sort, đếm run liên tục.
  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    if (prev !== null) {
      const gap =
        (new Date(`${day}T00:00:00.000Z`).getTime() -
          new Date(`${prev}T00:00:00.000Z`).getTime()) /
        86_400_000;
      run = gap === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = day;
  }

  return { current, longest: Math.max(longest, current) };
}
