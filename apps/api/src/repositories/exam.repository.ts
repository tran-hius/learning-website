import { Prisma } from "@prisma/client";
import { db } from "../utils/db";
import type { QuestionRow } from "./content.repository";

/**
 * Exam repository — ExamSession / ExamAnswer / ExamResult (contract mục 5, TASK-005).
 * Service không đụng Prisma trực tiếp (giữ style TASK-002/004).
 */

export type ExamSessionRow = {
  id: string;
  userId: string;
  examBankId: string | null;
  kind: "PRACTICE_TEST" | "PLACEMENT_TEST";
  startedAt: Date;
  expiresAt: Date;
  submittedAt: Date | null;
  status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | "CLOSED";
  questionIds: string[];
  /// D15-BE (TASK-006): số vi phạm proctoring client submit kèm E4 (null = chưa submit).
  proctoringViolations: number | null;
};

export type ExamAnswerRow = {
  questionId: string;
  value: unknown;
  isCorrect: boolean | null;
};

export type ExamBankWithMeta = {
  id: string;
  name: string;
  durationSec: number;
};

export type ExamHistoryRow = {
  sessionId: string;
  kind: ExamSessionRow["kind"];
  subjectName: string | null;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  submittedAt: Date;
  timeSpentSec: number;
};

export interface IExamRepository {
  findExamBankWithMeta(id: string): Promise<ExamBankWithMeta | null>;
  listQuestionPool(where: Prisma.QuestionItemWhereInput): Promise<QuestionRow[]>;
  findInProgressSession(
    userId: string,
    examBankId: string | null,
    kind: "PRACTICE_TEST" | "PLACEMENT_TEST",
  ): Promise<ExamSessionRow | null>;
  createSession(data: {
    userId: string;
    examBankId: string | null;
    kind: "PRACTICE_TEST" | "PLACEMENT_TEST";
    expiresAt: Date;
    questionIds: string[];
  }): Promise<ExamSessionRow>;
  findSessionById(id: string): Promise<ExamSessionRow | null>;
  markExpired(id: string): Promise<void>;
  findQuestionsByIds(ids: string[]): Promise<QuestionRow[]>;
  listAnswers(sessionId: string): Promise<ExamAnswerRow[]>;
  upsertAnswers(
    sessionId: string,
    rows: Array<{ questionId: string; value: unknown }>,
  ): Promise<void>;
  submitSession(data: {
    sessionId: string;
    score: number;
    maxScore: number;
    percent: number;
    passed: boolean;
    timeSpentSec: number;
    weakTopics: string[];
    proctoringViolations: number;
    answers: Array<{ questionId: string; value: unknown; isCorrect: boolean }>;
  }): Promise<void>;
  findSubmittedSession(sessionId: string): Promise<
    | (ExamSessionRow & {
        result: {
          score: number;
          maxScore: number;
          percent: number;
          passed: boolean;
          timeSpentSec: number;
          weakTopics: string[];
        } | null;
      })
    | null
  >;
  listHistory(userId: string): Promise<ExamHistoryRow[]>;
}

const questionSelect = {
  id: true,
  type: true,
  difficulty: true,
  stem: true,
  media: true,
  options: true,
  answer: true,
  explanation: true,
  thinkingHints: true,
  hintAnswerRef: true,
} satisfies Prisma.QuestionItemSelect;

function toSessionRow(row: {
  id: string;
  userId: string;
  examBankId: string | null;
  kind: "PRACTICE_TEST" | "PLACEMENT_TEST";
  startedAt: Date;
  expiresAt: Date;
  submittedAt: Date | null;
  status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | "CLOSED";
  questionIds: unknown;
  proctoringViolations: unknown;
}): ExamSessionRow {
  return {
    ...row,
    questionIds: Array.isArray(row.questionIds) ? (row.questionIds as string[]) : [],
    proctoringViolations:
      typeof row.proctoringViolations === "number" ? row.proctoringViolations : null,
  };
}

const sessionSelect = {
  id: true,
  userId: true,
  examBankId: true,
  kind: true,
  startedAt: true,
  expiresAt: true,
  submittedAt: true,
  status: true,
  questionIds: true,
  proctoringViolations: true,
} satisfies Prisma.ExamSessionSelect;

export class ExamRepository implements IExamRepository {
  async findExamBankWithMeta(id: string): Promise<ExamBankWithMeta | null> {
    return db.examBank.findUnique({
      where: { id },
      select: { id: true, name: true, durationSec: true },
    });
  }

  async listQuestionPool(where: Prisma.QuestionItemWhereInput): Promise<QuestionRow[]> {
    return db.questionItem.findMany({ where, select: questionSelect });
  }

  async findInProgressSession(
    userId: string,
    examBankId: string | null,
    kind: "PRACTICE_TEST" | "PLACEMENT_TEST",
  ): Promise<ExamSessionRow | null> {
    const row = await db.examSession.findFirst({
      where: {
        userId,
        status: "IN_PROGRESS",
        kind,
        ...(examBankId ? { examBankId } : { examBankId: null }),
      },
      select: sessionSelect,
      orderBy: { startedAt: "desc" },
    });
    return row ? toSessionRow(row) : null;
  }

  async createSession(data: {
    userId: string;
    examBankId: string | null;
    kind: "PRACTICE_TEST" | "PLACEMENT_TEST";
    expiresAt: Date;
    questionIds: string[];
  }): Promise<ExamSessionRow> {
    const row = await db.examSession.create({
      data: {
        userId: data.userId,
        ...(data.examBankId ? { examBankId: data.examBankId } : {}),
        kind: data.kind,
        expiresAt: data.expiresAt,
        questionIds: data.questionIds as unknown as Prisma.InputJsonValue,
      },
      select: sessionSelect,
    });
    return toSessionRow(row);
  }

  async findSessionById(id: string): Promise<ExamSessionRow | null> {
    const row = await db.examSession.findUnique({ where: { id }, select: sessionSelect });
    return row ? toSessionRow(row) : null;
  }

  async markExpired(id: string): Promise<void> {
    await db.examSession.update({
      where: { id },
      data: { status: "EXPIRED" },
      select: { id: true },
    });
  }

  async findQuestionsByIds(ids: string[]): Promise<QuestionRow[]> {
    if (ids.length === 0) return [];
    const rows = await db.questionItem.findMany({
      where: { id: { in: ids } },
      select: questionSelect,
    });
    // Giữ thứ tự đề đã random theo index.
    const byId = new Map<string, QuestionRow>(
      rows.map((r) => [r.id, r as unknown as QuestionRow]),
    );
    const ordered: QuestionRow[] = [];
    for (const id of ids) {
      const q = byId.get(id);
      if (q) ordered.push(q);
    }
    return ordered;
  }

  async listAnswers(sessionId: string): Promise<ExamAnswerRow[]> {
    return db.examAnswer.findMany({
      where: { sessionId },
      select: { questionId: true, value: true, isCorrect: true },
    });
  }

  async upsertAnswers(
    sessionId: string,
    rows: Array<{ questionId: string; value: unknown }>,
  ): Promise<void> {
    if (rows.length === 0) return;
    await db.$transaction(
      rows.map((r) =>
        db.examAnswer.upsert({
          where: { sessionId_questionId: { sessionId, questionId: r.questionId } },
          update: { value: r.value as Prisma.InputJsonValue, isCorrect: null },
          create: {
            sessionId,
            questionId: r.questionId,
            value: r.value as Prisma.InputJsonValue,
          },
        }),
      ),
    );
  }

  async submitSession(data: {
    sessionId: string;
    score: number;
    maxScore: number;
    percent: number;
    passed: boolean;
    timeSpentSec: number;
    weakTopics: string[];
    proctoringViolations: number;
    answers: Array<{ questionId: string; value: unknown; isCorrect: boolean }>;
  }): Promise<void> {
    await db.$transaction([
      // D16-2 (TASK-006): UPSERT đáp án (autosave ∪ submit, submit ưu tiên đã merge ở
      // service) thay vì deleteMany + createMany — autosave không bị xoá sạch.
      ...data.answers.map((a) =>
        db.examAnswer.upsert({
          where: { sessionId_questionId: { sessionId: data.sessionId, questionId: a.questionId } },
          update: {
            value: a.value as Prisma.InputJsonValue,
            isCorrect: a.isCorrect,
          },
          create: {
            sessionId: data.sessionId,
            questionId: a.questionId,
            value: a.value as Prisma.InputJsonValue,
            isCorrect: a.isCorrect,
          },
        }),
      ),
      db.examResult.upsert({
        where: { sessionId: data.sessionId },
        update: {
          score: data.score,
          maxScore: data.maxScore,
          percent: data.percent,
          passed: data.passed,
          timeSpentSec: data.timeSpentSec,
          weakTopics: data.weakTopics as unknown as Prisma.InputJsonValue,
        },
        create: {
          sessionId: data.sessionId,
          score: data.score,
          maxScore: data.maxScore,
          percent: data.percent,
          passed: data.passed,
          timeSpentSec: data.timeSpentSec,
          weakTopics: data.weakTopics as unknown as Prisma.InputJsonValue,
        },
      }),
      // D15-BE: lưu số vi phạm proctoring vào session (E6 trả lại, không ảnh hưởng điểm).
      db.examSession.update({
        where: { id: data.sessionId },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          proctoringViolations: data.proctoringViolations,
        },
        select: { id: true },
      }),
    ]);
  }

  async findSubmittedSession(sessionId: string) {
    const row = await db.examSession.findUnique({
      where: { id: sessionId },
      select: {
        ...sessionSelect,
        result: {
          select: {
            score: true,
            maxScore: true,
            percent: true,
            passed: true,
            timeSpentSec: true,
            weakTopics: true,
          },
        },
      },
    });
    if (!row) return null;
    const { result, ...session } = row;
    return {
      ...toSessionRow(session),
      result: result
        ? {
            ...result,
            weakTopics: Array.isArray(result.weakTopics) ? (result.weakTopics as string[]) : [],
          }
        : null,
    };
  }

  async listHistory(userId: string): Promise<ExamHistoryRow[]> {
    const rows = await db.examSession.findMany({
      where: { userId, status: "SUBMITTED", result: { isNot: null } },
      select: {
        id: true,
        kind: true,
        startedAt: true,
        examBank: { select: { name: true } },
        result: {
          select: {
            score: true,
            maxScore: true,
            percent: true,
            passed: true,
            timeSpentSec: true,
          },
        },
        submittedAt: true,
      },
      orderBy: { submittedAt: "desc" },
    });
    return rows.map((r) => ({
      sessionId: r.id,
      kind: r.kind,
      // ExamBank chưa liên kết Subject trong schema — dùng tên bank làm subjectName (xem báo cáo).
      subjectName: r.examBank?.name ?? null,
      score: r.result?.score ?? 0,
      maxScore: r.result?.maxScore ?? 0,
      percent: r.result?.percent ?? 0,
      passed: r.result?.passed ?? false,
      submittedAt: r.submittedAt ?? r.startedAt,
      timeSpentSec: r.result?.timeSpentSec ?? 0,
    }));
  }
}
