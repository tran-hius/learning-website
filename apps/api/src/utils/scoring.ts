/**
 * Chấm bài practice/exam server-side (TASK-004 P1, TASK-005 E4) — pure functions.
 * Hỗ trợ đủ 5 loại câu hỏi theo contract mục 3.1:
 *   MCQ_SINGLE / LISTEN_MCQ  → value: string (option id)
 *   MCQ_MULTI                → value: string[] (đúng hết mới đúng — như E4)
 *   FILL_ANSWER              → value: string (so khớp không phân biệt hoa/thường, trim)
 *   MATCH_PAIRS              → value: {leftId, rightId}[] (id option, không phụ thuộc thứ tự)
 *
 * BE-2 (TASK-005): thống nhất shape MATCH_PAIRS với contract P1 = {leftId, rightId}
 * (id của option), thay cho {left, right} (text).
 */

export type QuestionAnswer = {
  correctOptionIds?: string[];
  correctText?: string;
  pairs?: Array<{ leftId: string; rightId: string }>;
};

export type QuestionTypeForScoring =
  | "MCQ_SINGLE"
  | "MCQ_MULTI"
  | "FILL_ANSWER"
  | "MATCH_PAIRS"
  | "LISTEN_MCQ";

export type PracticeAnswerValue =
  | string
  | string[]
  | Array<{ leftId: string; rightId: string }>;

function normalizeText(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, " ");
}

function pairsKeySet(pairs: Array<{ leftId: string; rightId: string }>): Set<string> {
  return new Set(pairs.map((p) => `${normalizeText(p.leftId)}=>${normalizeText(p.rightId)}`));
}

/** Đáp án của 1 câu có khớp với `answer` không. `value` là raw từ client. */
export function isAnswerCorrect(
  type: QuestionTypeForScoring,
  answer: QuestionAnswer,
  value: PracticeAnswerValue,
): boolean {
  switch (type) {
    case "MCQ_SINGLE":
    case "LISTEN_MCQ": {
      if (typeof value !== "string") return false;
      const correct = answer.correctOptionIds ?? [];
      return correct.length === 1 && correct[0] === value;
    }
    case "MCQ_MULTI": {
      if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) return false;
      const correct = [...(answer.correctOptionIds ?? [])].sort();
      const given = [...(value as string[])].sort();
      if (correct.length !== given.length) return false; // thiếu 1 đáp án cũng sai
      return correct.every((id, i) => id === given[i]);
    }
    case "FILL_ANSWER": {
      if (typeof value !== "string" || !answer.correctText) return false;
      return normalizeText(value) === normalizeText(answer.correctText);
    }
    case "MATCH_PAIRS": {
      if (!Array.isArray(value)) return false;
      const expected = answer.pairs ?? [];
      const given = value as Array<{ leftId: string; rightId: string }>;
      if (given.length !== expected.length) return false;
      const expectedKeys = pairsKeySet(expected);
      const givenKeys = pairsKeySet(given);
      if (expectedKeys.size !== givenKeys.size) return false;
      for (const key of givenKeys) {
        if (!expectedKeys.has(key)) return false;
      }
      return true;
    }
    default:
      return false;
  }
}

/** correctAnswer trả về client sau khi submit (tùy loại — contract P1). */
export function correctAnswerOf(type: QuestionTypeForScoring, answer: QuestionAnswer): unknown {
  switch (type) {
    case "MCQ_SINGLE":
    case "MCQ_MULTI":
    case "LISTEN_MCQ":
      return answer.correctOptionIds ?? [];
    case "FILL_ANSWER":
      return answer.correctText ?? "";
    case "MATCH_PAIRS":
      return answer.pairs ?? [];
    default:
      return null;
  }
}
