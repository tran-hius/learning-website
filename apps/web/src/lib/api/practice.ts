/**
 * Practice endpoints — contract mục 4 (P1, P2) của docs/api-contract.md.
 * Backend CHƯA mount /practice (routes/index.ts ghi chú mount theo task sau)
 * → mọi call sẽ lỗi NETWORK/404; UI bắt lỗi và rơi về chấm local demo mode.
 */
import { apiFetch } from "./client";
import type {
  AnswerValue,
  HintResult,
  PracticeAttemptInput,
  PracticeAttemptResult,
  PythonExecInput,
  PythonExecResult,
} from "./types";

/** P1 — POST /practice/:setId/attempt (server chấm, trả đáp án + giải thích). */
export function submitPracticeAttempt(
  setId: string,
  input: PracticeAttemptInput,
): Promise<PracticeAttemptResult> {
  return apiFetch<PracticeAttemptResult>(`/practice/${encodeURIComponent(setId)}/attempt`, {
    method: "POST",
    body: input,
  });
}

/** P2 — POST /practice/hints/:questionId — gợi ý theo bậc 1|2. */
export function getHint(questionId: string, level: 1 | 2): Promise<HintResult> {
  return apiFetch<HintResult>("/practice/hints/" + encodeURIComponent(questionId), {
    method: "POST",
    body: { level },
  });
}

/** P3 — POST /python/exec — chạy code Python qua Piston (rate limit 10 req/phút). */
export function execPython(input: PythonExecInput): Promise<PythonExecResult> {
  return apiFetch<PythonExecResult>("/python/exec", {
    method: "POST",
    body: input,
  });
}

/** Nhận giá trị AnswerValue từ input người dùng (chỉ dạng string/string[]). */
export function normalizeAnswer(
  value: AnswerValue | null | undefined,
): string | string[] | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const strs = value.filter((v): v is string => typeof v === "string").sort();
    return strs.length ? strs : null;
  }
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s === "" ? null : s;
}
