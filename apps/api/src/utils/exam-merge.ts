/**
 * D16-2 (TASK-006): hợp nhất đáp án autosave (E3) ∪ submit (E4) — PURE function.
 *
 * Quy tắc: submit ƯU TIÊN (ghi đè autosave cùng questionId); chỉ giữ câu thuộc đề
 * (knownIds); autosave của câu không được submit vẫn được giữ lại để chấm.
 * Đây là pure function để unit test không cần DB (DoD TASK-006: test chứng minh merge).
 */
export type AnswerRow = { questionId: string; value: unknown };

export function mergeExamAnswers(
  autosave: AnswerRow[],
  submitted: AnswerRow[],
  knownIds: ReadonlySet<string>,
): AnswerRow[] {
  const merged = new Map<string, unknown>();
  for (const row of autosave) {
    if (knownIds.has(row.questionId)) merged.set(row.questionId, row.value);
  }
  for (const row of submitted) {
    if (knownIds.has(row.questionId)) merged.set(row.questionId, row.value);
  }
  return [...merged.entries()].map(([questionId, value]) => ({ questionId, value }));
}
