"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  FlaskConical,
  Loader2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "./CountdownTimer";
import { ExamQuestionCard } from "./ExamQuestionCard";
import type { PairValue } from "./MatchPairsForm";
import { ResultCelebration } from "@/components/feedback/ResultCelebration";
import { startExam, getExamQuestions, saveExamProgress, submitExam } from "@/lib/api/exams";
import { friendlyApiMessage, isApiError } from "@/lib/api/client";
import { DEMO_EXAM } from "@/lib/demo/demo-exam";
import type {
  AnswerValue,
  ExamQuestionItem,
  ExamResult,
  ExamSession,
  QuestionType,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Phòng thi — task TASK-005 (contract mục 5, D13):
 * - E1 POST /exams → session; E2 GET questions (ẩn đáp án); API lỗi → DEMO
 *   trung thực (banner honey, chấm local, không gửi server).
 * - Đếm ngược TUYỆT ĐỐI theo expiresAt (CountdownTimer — refresh không sai giờ).
 * - E3 autosave progress (debounce 1.5s, nhãn "Đã lưu ✓").
 * - E4 submit (confirm trước khi nộp) → ResultCelebration tái dùng (D8/D9)
 *   + review perQuestion (đúng/sai + giải thích).
 * - Quá hạn: backend chặn (409 EXAM_STATE_CONFLICT) → FE khóa form + banner.
 */

type Phase = "loading" | "ready" | "result";
type SaveState = "idle" | "saving" | "saved" | "error";

type ExamQ = {
  id: string;
  type: QuestionType;
  stem: string;
  options: ExamQuestionItem["options"];
  media?: ExamQuestionItem["media"];
};

type AnswerMap = Record<string, AnswerValue | null>;

/** Câu đã trả lời chưa (theo loại câu). */
function isAnswered(value: AnswerValue | null): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) {
    if (value.length === 0) return false;
    if (value.every((v) => typeof v === "string")) return true; // MCQ_MULTI
    return true; // MATCH_PAIRS {leftId, rightId}[]
  }
  return false;
}

/** So giá trị demo (string / string[] / pairs) — mirror utils/scoring.ts. */
function demoIsCorrect(type: QuestionType, answer: unknown, value: AnswerValue): boolean {
  if (type === "FILL_ANSWER" || type === "MCQ_SINGLE" || type === "LISTEN_MCQ") {
    return typeof value === "string" && typeof answer === "string"
      ? value.trim().toLowerCase() === answer.trim().toLowerCase()
      : false;
  }
  if (type === "MCQ_MULTI") {
    if (!Array.isArray(value) || !Array.isArray(answer)) return false;
    const given = value.filter((v): v is string => typeof v === "string").sort();
    const expected = (answer as string[]).slice().sort();
    return given.length === expected.length && given.every((v, i) => v === expected[i]);
  }
  if (type === "MATCH_PAIRS") {
    if (!Array.isArray(value) || !Array.isArray(answer)) return false;
    const key = (p: PairValue) => `${p.leftId}=>${p.rightId}`;
    const given = value
      .filter((v): v is PairValue => typeof v === "object" && v !== null)
      .map(key)
      .sort();
    const expected = (answer as PairValue[]).map(key).sort();
    return given.length === expected.length && given.every((v, i) => v === expected[i]);
  }
  return false;
}

/** Chấm local demo → cùng shape ExamResult (E4) để tái dùng toàn bộ UI kết quả. */
function gradeDemoExam(answers: AnswerMap): ExamResult {
  const perQuestion = DEMO_EXAM.questions.map((q) => {
    const value = answers[q.id] ?? null;
    const isCorrect = value !== null && demoIsCorrect(q.type, q.answer, value);
    return {
      questionId: q.id,
      isCorrect,
      yourAnswer: value as AnswerValue,
      correctAnswer: q.answer as ExamResult["perQuestion"][number]["correctAnswer"],
      explanation: q.explanation,
    };
  });
  const score = perQuestion.filter((p) => p.isCorrect).length;
  const maxScore = DEMO_EXAM.questions.length;
  const percent = maxScore === 0 ? 0 : Math.round((score / maxScore) * 1000) / 10;
  return {
    score,
    maxScore,
    percent,
    passed: percent >= 70,
    timeSpentSec: 0,
    perQuestion,
    weakTopics: [],
  };
}

export function ExamRunner({ examBankId }: { examBankId: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [session, setSession] = useState<ExamSession | null>(null);
  const [questions, setQuestions] = useState<ExamQ[]>([]);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [current, setCurrent] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [expired, setExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const init = useCallback(async () => {
    setPhase("loading");
    setExpired(false);
    setError(null);
    setDemo(false);
    setDemoNotice(null);
    setNeedLogin(false);
    setResult(null);
    setShowCelebration(false);
    setAnswers({});
    setCurrent(0);
    setSaveState("idle");
    try {
      // E1 — resume: còn session IN_PROGRESS backend trả lại session cũ.
      const { session: s } = await startExam({ examBankId, kind: "PRACTICE_TEST" });
      const { items } = await getExamQuestions(s.id);
      setSession(s);
      setQuestions(items.map((it) => ({ id: it.questionId, type: it.type, stem: it.stem, options: it.options, media: it.media })));
      setPhase("ready");
    } catch (err) {
      // D13: fallback demo trung thực — chấm local, không gửi server.
      if (isApiError(err) && (err.code === "AUTH_REQUIRED" || err.status === 401)) setNeedLogin(true);
      setDemoNotice(
        `Server thi chưa trả lời được (${friendlyApiMessage(err)}) — chuyển sang đề demo, điểm KHÔNG được lưu.`,
      );
      setDemo(true);
      setSession({
        id: "demo-session",
        durationSec: DEMO_EXAM.durationSec,
        totalQuestions: DEMO_EXAM.questions.length,
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + DEMO_EXAM.durationSec * 1000).toISOString(),
      });
      setQuestions(
        DEMO_EXAM.questions.map((q) => ({ id: q.id, type: q.type, stem: q.stem, options: q.options })),
      );
      setPhase("ready");
    }
  }, [examBankId]);

  useEffect(() => {
    void init();
  }, [init]);

  // E3 — autosave debounce 1.5s mỗi lần đổi đáp án (không chạy ở demo).
  useEffect(() => {
    if (phase !== "ready" || demo || !session || expired) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const entries = Object.entries(answersRef.current)
        .filter(([, v]) => isAnswered(v))
        .map(([questionId, v]) => ({ questionId, value: v as AnswerValue }));
      if (entries.length === 0) return;
      setSaveState("saving");
      try {
        await saveExamProgress(session.id, entries);
        setSaveState("saved");
      } catch {
        // Quá hạn giữa chừng → backend 409; hiển thị chưa lưu, không chết UI.
        setSaveState("error");
      }
    }, 1500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [answers, phase, demo, session, expired]);

  const answeredCount = useMemo(
    () => questions.filter((q) => isAnswered(answers[q.id] ?? null)).length,
    [questions, answers],
  );
  const total = questions.length;

  const onExpire = useCallback(() => setExpired(true), []);

  async function handleSubmit() {
    if (!session) return;
    setConfirmOpen(false);
    setSubmitting(true);
    setError(null);
    try {
      if (demo) {
        // Demo: chấm local, trung thực — không gọi E4.
        await new Promise((r) => setTimeout(r, 400));
        setResult(gradeDemoExam(answers));
      } else {
        const res = await submitExam(session.id, {
          answers: Object.entries(answers)
            .filter(([, v]) => isAnswered(v))
            .map(([questionId, v]) => ({ questionId, value: v as AnswerValue })),
        });
        setResult(res);
      }
      setPhase("result");
      setShowCelebration(true);
    } catch (err) {
      setError(friendlyApiMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function retry() {
    setShowCelebration(false);
    void init();
  }

  function review() {
    setShowCelebration(false);
    document.getElementById("exam-review")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-[320px] items-center justify-center gap-3 text-[15px] text-ink-700">
        <Loader2 className="size-5 animate-spin text-teal-fresh-500" aria-hidden />
        Đang tạo phòng thi cho bạn…
      </div>
    );
  }

  const q = questions[current];

  if (phase === "ready" && q) {
    const durationSec = session?.durationSec ?? DEMO_EXAM.durationSec;
    return (
      <div className="flex flex-col gap-5">
        {demoNotice ? (
          <p className="flex items-start gap-2 rounded-[12px] border border-dashed border-honey-300 bg-honey-50 px-4 py-3 text-sm text-ink-700 animate-pop-in">
            <FlaskConical className="mt-0.5 size-4 shrink-0 text-honey-500" aria-hidden />
            <span>
              <strong className="font-semibold">Chế độ demo</strong> — {demoNotice}
              {needLogin ? (
                <>
                  {" "}
                  Hoặc{" "}
                  <Link href="/login" className="font-semibold text-teal-fresh-600 underline-offset-4 hover:underline">
                    đăng nhập
                  </Link>{" "}
                  để thi thật nha!
                </>
              ) : null}
            </span>
          </p>
        ) : null}

        {/* Header thi: đếm ngược tuyệt đối + tiến độ + nhãn autosave */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-ink-300/30 bg-paper p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <CountdownTimer
              expiresAt={session?.expiresAt ?? new Date().toISOString()}
              durationSec={durationSec}
              onExpire={onExpire}
            />
            <span className="text-sm font-medium text-ink-700">
              Đã trả lời {answeredCount}/{total} câu
            </span>
          </div>
          <span
            className={cn(
              "text-sm",
              saveState === "saved" && "text-mint-600",
              saveState === "saving" && "text-ink-500",
              saveState === "error" && "text-coral-600",
              (saveState === "idle" || demo) && "text-ink-500",
            )}
            aria-live="polite"
          >
            {demo
              ? "Demo — không lưu server"
              : saveState === "saving"
                ? "Đang lưu…"
                : saveState === "saved"
                  ? "Đã lưu ✓"
                  : saveState === "error"
                    ? "Chưa lưu được — thử lại nhé"
                    : "Tự động lưu khi bạn trả lời"}
          </span>
        </div>

        {expired ? (
          <p role="alert" className="flex items-center gap-2 rounded-[12px] bg-coral-50 px-4 py-3 text-sm font-medium text-coral-600">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            Đã hết giờ — bài thi đóng theo deadline của đề. Bấm “Làm lại” để mở lượt thi mới nhé!
            <Button variant="outline" size="sm" onClick={retry} className="ml-auto">
              Làm lại
            </Button>
          </p>
        ) : null}

        {/* Grid nhảy câu: đã trả lời / câu hiện tại */}
        <nav aria-label="Danh sách câu hỏi" className="flex flex-wrap gap-2">
          {questions.map((item, i) => {
            const answeredQ = isAnswered(answers[item.id] ?? null);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Nhảy đến câu ${i + 1}${answeredQ ? " (đã trả lời)" : ""}`}
                aria-current={i === current}
                className={cn(
                  "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px] border text-sm font-semibold transition-all duration-200 ease-out",
                  i === current
                    ? "border-teal-fresh-500 bg-teal-fresh-500 text-white"
                    : answeredQ
                      ? "border-teal-fresh-300 bg-teal-fresh-50 text-teal-fresh-600"
                      : "border-ink-300/50 bg-paper text-ink-500 hover:border-teal-fresh-400",
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </nav>

        {/* Mỗi câu 1 card (guide mục 7) */}
        <ExamQuestionCard
          question={q}
          index={current}
          total={total}
          value={answers[q.id] ?? null}
          onChange={(id, value) => setAnswers((prev) => ({ ...prev, [id]: value }))}
          disabled={submitting || expired}
        />

        {/* Điều hướng + nộp bài */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
          >
            <ArrowLeft aria-hidden /> Câu trước
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
            disabled={current >= total - 1}
          >
            Câu sau <ArrowRight aria-hidden />
          </Button>
          <Button
            variant="coral"
            size="lg"
            onClick={() => setConfirmOpen(true)}
            disabled={submitting || expired}
            className="ml-auto"
          >
            {submitting ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
            Nộp bài
          </Button>
        </div>

        {error ? (
          <p role="alert" className="rounded-[12px] bg-coral-50 px-4 py-3 text-sm text-coral-600">
            {error}
          </p>
        ) : null}

        {/* Confirm trước khi nộp — báo câu chưa trả lời */}
        {confirmOpen ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Xác nhận nộp bài"
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/30 p-4 backdrop-blur-[2px] animate-fade-in"
          >
            <div className="w-full max-w-sm rounded-[16px] bg-paper p-6 text-center shadow-[0_8px_32px_rgba(0,0,0,0.08)] animate-pop-in">
              <h2 className="text-lg font-bold text-ink-900">Nộp bài luôn chứ?</h2>
              {answeredCount < total ? (
                <p className="mt-2 text-[15px] text-ink-700">
                  Còn <strong className="font-semibold text-coral-600">{total - answeredCount} câu</strong> chưa
                  trả lời — câu bỏ trống sẽ bị tính sai nha!
                </p>
              ) : (
                <p className="mt-2 text-[15px] text-ink-700">Bạn đã trả lời đủ {total} câu — nộp luôn nhé!</p>
              )}
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button variant="coral" onClick={handleSubmit}>
                  <Send aria-hidden /> Nộp bài
                </Button>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  Làm tiếp
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // ── Phase result: celebration (D8/D9 tái dùng) + review perQuestion ──
  if (phase === "result" && result) {
    return (
      <div className="flex flex-col gap-5">
        <section id="exam-review" aria-label="Xem lại bài làm" className="flex flex-col gap-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-ink-900">Xem lại bài làm</h2>
          {result.perQuestion.map((p, i) => {
            const question = questions.find((item) => item.id === p.questionId);
            if (!question) return null;
            return (
              <ExamQuestionCard
                key={p.questionId}
                question={question}
                index={i}
                total={result.perQuestion.length}
                value={p.yourAnswer}
                onChange={() => undefined}
                disabled
                result={{
                  isCorrect: p.isCorrect,
                  correctAnswer: p.correctAnswer,
                  explanation: p.explanation,
                }}
              />
            );
          })}
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={retry}>
            <ArrowLeft aria-hidden /> Về đầu trang thi
          </Button>
          <Link
            href={`/exams/${encodeURIComponent(examBankId)}/history`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[12px] px-4 text-[15px] font-semibold text-teal-fresh-600 underline-offset-4 transition-colors duration-200 hover:underline"
          >
            Xem lịch sử thi
          </Link>
        </div>

        {demo ? (
          <p className="flex items-center gap-2 rounded-[12px] border border-dashed border-honey-300 bg-honey-50 px-4 py-3 text-sm text-ink-700">
            <Check className="size-4 shrink-0 text-honey-500" aria-hidden />
            Kết quả trên chấm bằng dữ liệu demo — chưa ghi vào server nha.
          </p>
        ) : null}

        {showCelebration ? (
          <ResultCelebration
            percent={result.percent}
            scoreLabel={`${result.score}/${result.maxScore}`}
            onClose={() => setShowCelebration(false)}
            onRetry={result.percent < 70 ? retry : undefined}
            reviewLabel="Xem lại bài làm"
            onReview={result.percent < 70 ? review : undefined}
          />
        ) : null}
      </div>
    );
  }

  return null;
}
