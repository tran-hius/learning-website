/**
 * Exam timer — PURE functions (TASK-005, DoD: logic remaining KHÔNG phụ thuộc Redis).
 *
 * Chiến lược (D13 + task notes):
 * - `expiresAt` LUÔN được lưu trong DB (ExamSession.expiresAt) — nguồn chân lý.
 * - Redis có → mirror deadline vào key `exam:deadline:{sessionId}` (TTL = duration,
 *   atomic SET EX) để phase 2 dùng push通知; Redis chết → bỏ qua, vẫn dùng DB.
 * - Mọi phép tính remaining/timeSpent ở đây chỉ nhận tham số thời gian → unit test
 *   không cần Redis.
 */

/** Số giây còn lại đến deadline, clamp ≥ 0. */
export function remainingSeconds(expiresAt: Date | string, now: Date): number {
  const exp = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const diffMs = exp.getTime() - now.getTime();
  if (Number.isNaN(diffMs)) return 0;
  return Math.max(0, Math.floor(diffMs / 1000));
}

/** Session đã quá hạn chưa (quá hạn → mọi PATCH/POST trả EXAM_STATE_CONFLICT — mục 5). */
export function isExpired(expiresAt: Date | string, now: Date): boolean {
  return remainingSeconds(expiresAt, now) <= 0;
}

/**
 * Thời gian làm bài thực tế (giây) = min(submitAt, expiresAt) - startedAt, clamp ≥ 0.
 * Nộp muộn không thể xảy ra qua API (bị chặn) nhưng guard vẫn clamp theo deadline.
 */
export function timeSpentSeconds(
  startedAt: Date | string,
  submittedAt: Date | string,
  expiresAt: Date | string,
): number {
  const start = typeof startedAt === "string" ? new Date(startedAt) : startedAt;
  const submitted = typeof submittedAt === "string" ? new Date(submittedAt) : submittedAt;
  const deadline = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const endMs = Math.min(submitted.getTime(), deadline.getTime());
  return Math.max(0, Math.floor((endMs - start.getTime()) / 1000));
}

/**
 * Chọn đề theo độ khó sequence contract mục 5: 60% MEDIUM, 20% EASY, 20% HARD.
 * `total` = số câu mục tiêu; nếu pool một độ khó thiếu thì lấy bù từ các độ khó còn lại.
 * Trả về mảng id (đÃ shuffle trong từng nhóm độ khó để đề không lặp thứ tự).
 */
export function pickQuestionIdsByDifficulty(
  pool: Array<{ id: string; difficulty: "EASY" | "MEDIUM" | "HARD" }>,
  total: number,
  random: () => number = Math.random,
): string[] {
  const byDifficulty: Record<"EASY" | "MEDIUM" | "HARD", string[]> = {
    EASY: [],
    MEDIUM: [],
    HARD: [],
  };
  const shuffled = [...pool].sort(() => random() - 0.5);
  for (const q of shuffled) byDifficulty[q.difficulty].push(q.id);

  const targets: Array<["EASY" | "MEDIUM" | "HARD", number]> = [
    ["MEDIUM", Math.floor(total * 0.6)],
    ["EASY", Math.floor(total * 0.2)],
    ["HARD", Math.floor(total * 0.2)],
  ];

  const picked: string[] = [];
  let shortfall = 0;
  for (const [difficulty, want] of targets) {
    const take = Math.min(byDifficulty[difficulty].length, want + shortfall);
    picked.push(...byDifficulty[difficulty].slice(0, take));
    shortfall = want + shortfall - take;
  }
  // Bù phần thiếu (pool không đủ tỷ lệ) từ mọi độ khó còn dư, giữ tổng = min(total, pool).
  if (picked.length < total) {
    const used = new Set(picked);
    for (const q of shuffled) {
      if (picked.length >= total) break;
      if (!used.has(q.id)) {
        picked.push(q.id);
        used.add(q.id);
      }
    }
  }
  return picked;
}

/** Số câu của 1 đề thi (mặc định 20 — chưa chốt trong contract, xem báo cáo TASK-005). */
export const EXAM_QUESTION_COUNT = 20;
