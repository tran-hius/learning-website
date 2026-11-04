import { Prisma } from "@prisma/client";
import { AppError } from "../utils";
import { cacheGet, cacheSet, cacheDel } from "../utils/cache";
import { isAnswerCorrect, correctAnswerOf } from "../utils/scoring";
import {
  remainingSeconds,
  isExpired,
  timeSpentSeconds,
  pickQuestionIdsByDifficulty,
  EXAM_QUESTION_COUNT,
} from "../utils/exam-timer";
import { serializeQuestionForStudent } from "../utils/question-serializer";
import type { QuestionRow } from "../repositories/content.repository";
import { ExamRepository } from "../repositories/exam.repository";
import { ProgressRepository } from "../repositories/progress.repository";
import type { StartExamInput, ExamProgressInput, ExamSubmitInput } from "../validations";
import type { ExamSessionRow } from "../repositories/exam.repository";

/**
 * Exam service — contract mục 5 (E1–E6), TASK-005.
 *
 * Timer (D13): deadline nguồn chân lý là `ExamSession.expiresAt` (DB). Redis có →
 * mirror deadline/đề vào key `exam:session:{id}` (TTL = duration + 60s) & SET EX
 * atomic; Redis chết → mọi thứ vẫn chạy qua DB (best-effort như cache.ts).
 *
 * Quá hạn: mọi PATCH/POST trả EXAM_STATE_CONFLICT (mục 5 — không auto-submit,
 * contract không quy định auto-submit nên KHÔNG tự suy diễn).
 * Nộp 2 lần: SUBMITTED → idempotent, trả lại kết quả cũ.
 */

/** XP exam: +5 mỗi câu ĐÚNG (contract mục 6 — khác practice +2). */
export const EXAM_XP_PER_CORRECT = 5;

/** Điểm đạt 70% (D9: celebration ≥70 pháo hoa / <70 động viên — FE tái dùng). */
const PASS_PERCENT = 70;

type SessionEnvelope = {
  session: {
    id: string;
    durationSec: number;
    totalQuestions: number;
    startedAt: string;
    expiresAt: string;
    remainingSec: number;
  };
};

export class ExamService {
  constructor(
    private readonly exams: ExamRepository = new ExamRepository(),
    private readonly progress: ProgressRepository = new ProgressRepository(),
  ) {}

  // ── E1: POST /exams ─────────────────────────────────────────────────

  async startExam(userId: string, input: StartExamInput): Promise<SessionEnvelope> {
    const bank = input.examBankId
      ? await this.exams.findExamBankWithMeta(input.examBankId)
      : null;
    if (input.examBankId && !bank) {
      throw new AppError("NOT_FOUND", "Exam bank not found", 404);
    }

    // Chống mở lại attempt đang IN_PROGRESS: trả attempt hiện tại (resume) — task E1.
    const existing = await this.exams.findInProgressSession(
      userId,
      input.examBankId ?? null,
      input.kind,
    );
    if (existing && !isExpired(existing.expiresAt, new Date())) {
      return this.sessionEnvelope(existing);
    }
    if (existing) await this.exams.markExpired(existing.id);

    const durationSec = bank?.durationSec ?? 1800;
    const questionIds = await this.selectQuestionIds(input, EXAM_QUESTION_COUNT);

    const session = await this.exams.createSession({
      userId,
      examBankId: input.examBankId ?? null,
      kind: input.kind,
      expiresAt: new Date(Date.now() + durationSec * 1000),
      questionIds,
    });

    // Redis mirror (best-effort): đề + deadline. TTL = duration + 60s (contract E1).
    await cacheSet(
      `exam:session:${session.id}`,
      { userId, questionIds, expiresAt: session.expiresAt.toISOString() },
      durationSec + 60,
    );

    return this.sessionEnvelope(session);
  }

  /** Pool theo contract E1: bank → câu EXAM của bank; placement → EXAM toàn cục (lọc subject nếu có). */
  private async selectQuestionIds(
    input: StartExamInput,
    total: number,
  ): Promise<string[]> {
    const where: Prisma.QuestionItemWhereInput = { source: "EXAM" };
    if (input.examBankId) {
      where.examBankId = input.examBankId;
    } else if (input.subjectSlug) {
      // Placement theo subject: câu exam gắn practiceSet → lesson → chapter → subject.
      where.practiceSet = { lesson: { chapter: { subject: { slug: input.subjectSlug } } } };
    }
    const pool = await this.exams.listQuestionPool(where);
    if (pool.length === 0) {
      throw new AppError("VALIDATION_ERROR", "No exam questions available for this selection", 422);
    }
    return pickQuestionIdsByDifficulty(pool, total);
  }

  private sessionEnvelope(session: ExamSessionRow): SessionEnvelope {
    const durationSec = Math.max(
      0,
      Math.floor((session.expiresAt.getTime() - session.startedAt.getTime()) / 1000),
    );
    return {
      session: {
        id: session.id,
        durationSec,
        totalQuestions: session.questionIds.length,
        startedAt: session.startedAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        remainingSec: remainingSeconds(session.expiresAt, new Date()),
      },
    };
  }

  // ── Guard chung: ownership + trạng thái ─────────────────────────────

  private async requireOwnedSession(userId: string, sessionId: string): Promise<ExamSessionRow> {
    const session = await this.exams.findSessionById(sessionId);
    if (!session || session.userId !== userId) {
      throw new AppError("NOT_FOUND", "Exam session not found", 404);
    }
    if (session.status === "SUBMITTED" || session.status === "CLOSED") {
      throw new AppError(
        "EXAM_STATE_CONFLICT",
        "This exam session has already been submitted",
        409,
      );
    }
    if (session.status === "EXPIRED" || isExpired(session.expiresAt, new Date())) {
      if (session.status === "IN_PROGRESS") await this.exams.markExpired(session.id);
      throw new AppError("EXAM_STATE_CONFLICT", "This exam session has expired", 409);
    }
    return session;
  }

  // ── E2: GET /exams/:sessionId/questions ─────────────────────────────

  async getSessionQuestions(userId: string, sessionId: string) {
    const session = await this.requireOwnedSession(userId, sessionId);
    const questions = await this.loadSessionQuestions(session);
    return {
      session: {
        id: session.id,
        remainingSec: remainingSeconds(session.expiresAt, new Date()),
      },
      items: questions.map((q, index) => ({
        questionId: q.id,
        index,
        ...stripAnswer(
          serializeQuestionForStudent({
            ...q,
            answer: undefined,
            explanation: q.explanation,
            thinkingHints: q.thinkingHints,
            hintAnswerRef: q.hintAnswerRef,
          }),
        ),
      })),
    };
  }

  /** Đề từ DB (nguồn chân lý); Redis mirror chỉ dùng làm fast-path best-effort. */
  private async loadSessionQuestions(session: ExamSessionRow): Promise<QuestionRow[]> {
    return this.exams.findQuestionsByIds(session.questionIds);
  }

  // ── E3: PATCH /exams/:sessionId/progress (autosave) ─────────────────

  async saveProgress(userId: string, sessionId: string, input: ExamProgressInput) {
    const session = await this.requireOwnedSession(userId, sessionId);
    const known = new Set(session.questionIds);
    const rows = input.progress
      .filter((p) => known.has(p.questionId))
      .map((p) => ({ questionId: p.questionId, value: p.value }));
    await this.exams.upsertAnswers(sessionId, rows);
    return { saved: rows.length, remainingSec: remainingSeconds(session.expiresAt, new Date()) };
  }

  // ── E4: POST /exams/:sessionId/submit ───────────────────────────────

  async submitExam(userId: string, sessionId: string, input: ExamSubmitInput) {
    // Nộp 2 lần → idempotent: trả lại kết quả cũ (chọn idempotent thay vì 409).
    const existing = await this.exams.findSubmittedSession(sessionId);
    if (existing && existing.userId === userId) {
      return this.buildResultPayload(existing, await this.exams.listAnswers(sessionId));
    }

    const session = await this.requireOwnedSession(userId, sessionId);
    const questions = await this.loadSessionQuestions(session);
    const byId = new Map(questions.map((q) => [q.id, q]));

    // Ghi đáp án user submit (chỉ câu thuộc đề).
    const submitted = input.answers.filter((a) => byId.has(a.questionId));
    const submittedMap = new Map(submitted.map((a) => [a.questionId, a.value]));

    const perQuestion: Array<{
      questionId: string;
      isCorrect: boolean;
      yourAnswer: unknown;
      correctAnswer: unknown;
      explanation: string | null;
    }> = [];
    const weakTopics = new Set<string>();
    let score = 0;

    for (const q of questions) {
      const answer = (q.answer ?? {}) as never;
      const value = submittedMap.get(q.id); // không trả lời → sai (không điểm trừ)
      const isCorrect =
        value !== undefined && isAnswerCorrect(q.type, answer, value as never);
      if (isCorrect) score++;
      else if (typeof q.hintAnswerRef === "string" && q.hintAnswerRef.length > 0) {
        weakTopics.add(q.hintAnswerRef);
      }
      perQuestion.push({
        questionId: q.id,
        isCorrect,
        yourAnswer: value ?? null,
        correctAnswer: correctAnswerOf(q.type, answer),
        explanation: q.explanation,
      });
    }

    const maxScore = questions.length;
    const percent = maxScore === 0 ? 0 : Math.round((score / maxScore) * 1000) / 10;
    const timeSpentSec = timeSpentSeconds(session.startedAt, new Date(), session.expiresAt);
    const correctCount = score;

    await this.exams.submitSession({
      sessionId,
      score,
      maxScore,
      percent,
      passed: percent >= PASS_PERCENT,
      timeSpentSec,
      weakTopics: [...weakTopics],
      answers: perQuestion.map((p) => ({
        questionId: p.questionId,
        value: p.yourAnswer ?? "",
        isCorrect: p.isCorrect,
      })),
    });

    // Xoá Redis mirror (best-effort — contract E4: submit xong xóa session).
    await cacheDel(`exam:session:${sessionId}`);

    // XP exam: +5/câu đúng (contract mục 6).
    const xpEarned = correctCount * EXAM_XP_PER_CORRECT;
    if (xpEarned > 0) await this.progress.addXp(userId, xpEarned);

    const submittedAt = new Date();
    return {
      score,
      maxScore,
      percent,
      passed: percent >= PASS_PERCENT,
      timeSpentSec,
      xpEarned,
      perQuestion,
      weakTopics: [...weakTopics],
      submittedAt: submittedAt.toISOString(),
    };
  }

  /** Dựng payload kết quả từ row đã lưu (dùng cho idempotent E4 và E6). */
  private async buildResultPayload(
    session: ExamSessionRow & {
      result: {
        score: number;
        maxScore: number;
        percent: number;
        passed: boolean;
        timeSpentSec: number;
        weakTopics: string[];
      } | null;
    },
    answers: Array<{ questionId: string; value: unknown; isCorrect: boolean | null }>,
  ) {
    const result = session.result;
    if (!result) {
      throw new AppError("NOT_FOUND", "Exam result not found", 404);
    }
    const questions = await this.exams.findQuestionsByIds(session.questionIds);
    const byId = new Map(questions.map((q) => [q.id, q]));
    const answerMap = new Map(answers.map((a) => [a.questionId, a]));
    const perQuestion = session.questionIds.map((questionId) => {
      const q = byId.get(questionId);
      const a = answerMap.get(questionId);
      return {
        questionId,
        isCorrect: a?.isCorrect ?? false,
        yourAnswer: a?.value ?? null,
        correctAnswer: q ? correctAnswerOf(q.type, (q.answer ?? {}) as never) : null,
        explanation: q?.explanation ?? null,
      };
    });
    return {
      score: result.score,
      maxScore: result.maxScore,
      percent: result.percent,
      passed: result.passed,
      timeSpentSec: result.timeSpentSec,
      weakTopics: result.weakTopics,
      perQuestion,
      submittedAt: session.submittedAt?.toISOString() ?? null,
      // accuracy = percent/100 — FE tái dùng ResultCelebration (D9/D8).
      accuracy: result.percent / 100,
    };
  }

  // ── E5: GET /exams/history ──────────────────────────────────────────

  async getHistory(userId: string) {
    const items = await this.exams.listHistory(userId);
    return { items };
  }

  // ── E6: GET /exams/:sessionId (kết quả đã nộp) ──────────────────────

  async getSubmittedResult(userId: string, sessionId: string) {
    const session = await this.exams.findSubmittedSession(sessionId);
    if (!session || session.userId !== userId) {
      throw new AppError("NOT_FOUND", "Exam session not found", 404);
    }
    if (session.status !== "SUBMITTED" || !session.result) {
      throw new AppError(
        "EXAM_STATE_CONFLICT",
        "This exam session has not been submitted yet",
        409,
      );
    }
    return this.buildResultPayload(session, await this.exams.listAnswers(sessionId));
  }
}

/** E2 chỉ trả {questionId, index, type, stem, options, media} — bỏ cả thinkingHints. */
function stripAnswer(serialized: {
  id: string;
  type: string;
  difficulty: string;
  stem: string;
  media: unknown;
  options: unknown;
  thinkingHints: unknown[];
}) {
  return {
    type: serialized.type,
    stem: serialized.stem,
    media: serialized.media,
    options: serialized.options,
  };
}
