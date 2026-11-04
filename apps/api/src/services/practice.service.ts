import { appEnv } from "../config";
import { AppError } from "../utils/errors";
import { hitRateLimit, logger } from "../utils";
import { ContentRepository } from "../repositories";
import { ProgressRepository } from "../repositories/progress.repository";
import { isAnswerCorrect, correctAnswerOf } from "../utils/scoring";
import type { QuestionRow } from "../repositories";
import type { PracticeAttemptInput, HintBodyInput, PythonExecInput } from "../validations";

/**
 * Practice service — contract mục 4 (P1–P3), TASK-004.
 * P1: chấm server-side; practice attempt KHÔNG giới hạn, KHÔNG tạo exam session.
 * P2: hint theo bậc 1|2, log "self-solved" (đặt chỗ cho spaced repetition Phase 2).
 * P3: proxy Piston API, rate limit 10 req/phút/user qua Redis (best-effort).
 */

/** XP +2 mỗi câu đúng (contract mục 6). */
export const PRACTICE_XP_PER_CORRECT = 2;

const PYTHON_RATE_LIMIT = 10;
const PYTHON_RATE_WINDOW_SEC = 60;
/** Chỉ chạy python 3.10.0 — contract P3. */
const PISTON_LANGUAGE = "python";
const PISTON_VERSION = "3.10.0";
const PISTON_TIMEOUT_MS = 10_000;

export class PracticeService {
  constructor(
    private readonly content: ContentRepository = new ContentRepository(),
    private readonly progress: ProgressRepository = new ProgressRepository(),
  ) {}

  /**
   * P1: POST /practice/:setId/attempt → perQuestion + { xpEarned, accuracy }.
   * Chỉ chấm câu thuộc practice set này; câu lạ bị bỏ qua (không crash attempt).
   */
  async submitAttempt(userId: string, setId: string, input: PracticeAttemptInput) {
    const set = await this.content.findPracticeSetById(setId);
    if (!set) throw new AppError("NOT_FOUND", "Practice set not found", 404);

    const byId = new Map<string, QuestionRow>(set.questions.map((q) => [q.id, q]));
    const perQuestion: Array<{
      questionId: string;
      isCorrect: boolean;
      correctAnswer: unknown;
      explanation: string | null;
      thinkingHints: unknown;
    }> = [];
    let correctCount = 0;

    for (const ans of input.answers) {
      const question = byId.get(ans.questionId);
      if (!question) continue;
      const isCorrect = isAnswerCorrect(
        question.type,
        (question.answer ?? {}) as never,
        ans.value as never,
      );
      if (isCorrect) correctCount++;
      perQuestion.push({
        questionId: question.id,
        isCorrect,
        correctAnswer: correctAnswerOf(question.type, (question.answer ?? {}) as never),
        explanation: question.explanation,
        thinkingHints: question.thinkingHints ?? [],
      });
    }

    if (perQuestion.length === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "No submitted answer belongs to this practice set",
        422,
      );
    }

    const xpEarned = correctCount * PRACTICE_XP_PER_CORRECT;
    if (xpEarned > 0) {
      await this.progress.addXp(userId, xpEarned);
    }
    return {
      perQuestion,
      xpEarned,
      accuracy: correctCount / perQuestion.length,
    };
  }

  /** P2: POST /practice/hints/:questionId → { hint } theo level 1|2. */
  async getHint(questionId: string, input: HintBodyInput) {
    const question = await this.content.findQuestionById(questionId);
    if (!question) throw new AppError("NOT_FOUND", "Question not found", 404);
    const hints = Array.isArray(question.thinkingHints) ? question.thinkingHints : [];
    const hint = hints[input.level - 1] ?? null;
    // Log "self-solved" — đặt chỗ cho spaced repetition Phase 2 (contract mục 10).
    logger.info(
      { questionId, level: input.level, hintFound: hint !== null },
      "practice hint self-solved",
    );
    return { hint };
  }

  /** P3: POST /python/exec — proxy Piston, rate limit 10/phút/user (Redis best-effort). */
  async execPython(userId: string, input: PythonExecInput) {
    const rl = await hitRateLimit(`rl:python:${userId}`, PYTHON_RATE_LIMIT, PYTHON_RATE_WINDOW_SEC);
    if (!rl.allowed) {
      throw new AppError("RATE_LIMITED", "Too many Python executions, try again in a minute", 429, {
        rateLimitRemaining: 0,
      });
    }
    return this.callPiston(input.code, input.stdin);
  }

  /** Gọi Piston thật — tách method để unit test mock fetch global. */
  private async callPiston(code: string, stdin?: string) {
    const startedAt = Date.now();
    let res: Response;
    try {
      res = await fetch(appEnv.PISTON_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: PISTON_LANGUAGE,
          version: PISTON_VERSION,
          files: [{ name: "main.py", content: code }],
          ...(stdin !== undefined ? { stdin } : {}),
        }),
        signal: AbortSignal.timeout(PISTON_TIMEOUT_MS),
      });
    } catch (err) {
      logger.warn({ err }, "Piston API unreachable");
      throw new AppError("INTERNAL", "Code execution service is unavailable", 500);
    }
    if (!res.ok) {
      logger.warn({ status: res.status }, "Piston API returned error status");
      throw new AppError("INTERNAL", "Code execution service error", 500);
    }
    const body = (await res.json()) as {
      run?: { stdout?: string; stderr?: string; code?: number; signal?: string | null };
    };
    const run = body.run ?? {};
    return {
      stdout: run.stdout ?? "",
      stderr: run.stderr ?? "",
      exitCode: run.code ?? (run.signal ? 1 : 0),
      timeMs: Date.now() - startedAt,
    };
  }
}
