/**
 * Question serializer cho client KHI LÀM BÀI (contract mục 3.2 — BẮT BUỘC):
 * - `answer`, `explanation`, `hintAnswerRef` bị bỏ hoàn toàn.
 * - `thinkingHints` chỉ giữ bậc 1 (hints[0]); `thinkingHints[1..]` bị bỏ —
 *   bậc 2 chỉ trả qua endpoint P2 (POST /practice/hints/:questionId).
 * - Giữ lại: id, type, difficulty, stem, media, options.
 *
 * Đáp án chỉ xuất hiện lại sau khi submit (P1 / E4 response).
 */

export interface QuestionForStudent {
  id: string;
  type: string;
  difficulty: string;
  stem: string;
  media: unknown;
  options: unknown;
  answer: unknown;
  explanation: string | null;
  thinkingHints: unknown;
  hintAnswerRef: string | null;
}

export interface SerializedQuestion {
  id: string;
  type: string;
  difficulty: string;
  stem: string;
  media: unknown;
  options: unknown;
  /** Chỉ bậc 1; bậc 2 lấy qua P2 sau khi student xin gợi ý. */
  thinkingHints: unknown[];
}

/** Chấp nhận row Prisma (Json field là unknown) — pure, unit-testable. */
export function serializeQuestionForStudent(q: QuestionForStudent): SerializedQuestion {
  const rawHints = Array.isArray(q.thinkingHints) ? q.thinkingHints : [];
  return {
    id: q.id,
    type: q.type,
    difficulty: q.difficulty,
    stem: q.stem,
    media: q.media ?? null,
    options: q.options ?? [],
    thinkingHints: rawHints.slice(0, 1),
  };
}

/** Serialize toàn bộ câu hỏi của 1 practice set, giữ thứ tự. */
export function serializeQuestionsForStudent(
  questions: readonly QuestionForStudent[],
): SerializedQuestion[] {
  return questions.map(serializeQuestionForStudent);
}
