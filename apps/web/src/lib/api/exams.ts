import { apiFetch } from "./client";
import type {
  AnswerValue,
  ExamDetail,
  ExamHistoryItem,
  ExamQuestionItem,
  ExamResult,
  ExamSession,
  Paginated,
  PracticeAttemptInput,
  PracticeAttemptResult,
  PythonExecInput,
  PythonExecResult,
  StartExamInput,
  SubmitExamInput,
} from "./types";

/** E1 — Bắt đầu thi */
export function startExam(input: StartExamInput): Promise<{ session: ExamSession }> {
  return apiFetch("/exams", { method: "POST", body: input });
}

/** E2 — Lấy đề (đã ẩn đáp án) */
export function getExamQuestions(sessionId: string): Promise<{ items: ExamQuestionItem[] }> {
  return apiFetch(`/exams/${encodeURIComponent(sessionId)}/questions`);
}

/** E3 — Autosave câu trả lời */
export function saveExamProgress(
  sessionId: string,
  progress: Array<{ questionId: string; value: AnswerValue }>,
): Promise<{ ok: boolean }> {
  return apiFetch(`/exams/${encodeURIComponent(sessionId)}/progress`, {
    method: "PATCH",
    body: { progress },
  });
}

/** E4 — Nộp bài + kết quả chấm */
export function submitExam(sessionId: string, input: SubmitExamInput): Promise<ExamResult> {
  return apiFetch(`/exams/${encodeURIComponent(sessionId)}/submit`, {
    method: "POST",
    body: input,
  });
}

/** E5 — Lịch sử thi */
export function getExamHistory(query?: {
  page?: number;
  limit?: number;
}): Promise<Paginated<ExamHistoryItem>> {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiFetch(`/exams/history${qs ? `?${qs}` : ""}`);
}

/** E6 — Chi tiết 1 lần thi đã nộp */
export function getExamDetail(sessionId: string): Promise<ExamDetail> {
  return apiFetch(`/exams/${encodeURIComponent(sessionId)}`);
}

/** P1 — Nộp practice attempt (chấm ngay, trả đáp án ngay) */
export function attemptPractice(input: PracticeAttemptInput): Promise<PracticeAttemptResult> {
  return apiFetch("/practice/attempt", { method: "POST", body: input });
}

/** P2 — Gợi ý theo bậc 1 → 2 */
export function getHint(questionId: string, level: 1 | 2): Promise<{ hint: string }> {
  return apiFetch(`/practice/hints/${encodeURIComponent(questionId)}`, {
    method: "POST",
    body: { level },
  });
}

/** P3 — Chạy code Python qua Piston (rate limit 10 req/phút) */
export function runPython(input: PythonExecInput): Promise<PythonExecResult> {
  return apiFetch("/python/exec", { method: "POST", body: input });
}
