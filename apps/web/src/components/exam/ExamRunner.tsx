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
  MonitorX,
  Send,
  ShieldAlert,
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
  ExamKind,
  ExamQuestionItem,
  ExamResult,
  ExamSession,
  QuestionType,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Phòng thi — task TASK-005 + TASK-006 (contract mục 5, D13/D15/D16):
 * - E1 POST /exams → session; E2 GET questions (ẩn đáp án, v1.1 trả `progress`
 *   autosave → D16-FE: khôi phục grid + câu đã trả lời sau reload); API lỗi →
 *   DEMO trung thực (banner honey, chấm local, không gửi server).
 * - Đếm ngược TUYỆT ĐỐI theo expiresAt (CountdownTimer — refresh không sai giờ).
 * - E3 autosave progress (debounce 1.5s, nhãn "Đã lưu ✓").
 * - E4 submit (confirm trước khi nộp, D15 kèm `violations`) → ResultCelebration
 *   (D8/D9) + review perQuestion.
 * - D15 proctoring (giả định task file: backend KHÔNG có cờ `proctored`, seed chỉ
 *   có bank Toán) → áp dụng cho kind PLACEMENT_TEST + bank tiếng Anh (id/slug
 *   khớp /tieng-anh|english|anh-van/): fullscreen + chặn copy/contextmenu +
 *   fullscreenchange/visibilitychange → overlay 5s + đếm vi phạm, đủ 3 → tự nộp.
 * - Quá hạn: backend chặn (409 EXAM_STATE_CONFLICT) → FE khóa form + banner.
 */

type Phase = "loading" | "ready" | "result";
type SaveState = "idle" | "saving" | "saved" | "error";

const VIOLATION_LIMIT = 3;
const WARN_SECONDS = 5;

export interface ExamRunnerProps {
  /** examBankId (thi theo bank). Placement để trống — pool toàn cục. */
  examBankId?: string;
  /** Loại thi — mặc định PRACTICE_TEST (D15: placement luôn bật proctoring). */
  kind?: ExamKind;
  /** Ép bật/tắt proctoring (bỏ qua heuristic). */
  proctored?: boolean;
  /** Callback sau khi nộp thành công (dùng bởi placement — hiển thị lộ trình gợi ý). */
  onSubmitted?: (result: ExamResult) => void;
}

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

/** Heuristic D15 (giả định đã ghi báo cáo): bank nào là "tiếng Anh". */
function isEnglishBank(examBankId?: string): boolean {
  return typeof examBankId === "string" && /tieng-anh|tiếng anh|english|anh-van/i.test(examBankId);
}

/**
 * A11y (TASK-007): focus trap + Escape-close cho modal thường (confirm nộp /
 * tạm dừng thi). Overlay proctoring KHÔNG dùng hook này — Escape không được
 * phép đóng để bỏ cảnh báo.
 */
function useFocusTrap(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    const prevFocus = document.activeElement as HTMLElement | null;
    const focusables = () =>
      node
        ? Array.from(
            node.querySelectorAll<HTMLElement>(
              'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => !el.hasAttribute("disabled"))
        : [];
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const list = focusables();
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    node?.addEventListener("keydown", onKey);
    return () => {
      node?.removeEventListener("keydown", onKey);
      prevFocus?.focus();
    };
  }, [open, onClose]);
  return ref;
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

export function ExamRunner({ examBankId, kind = "PRACTICE_TEST", proctored: proctoredProp, onSubmitted }: ExamRunnerProps) {
  // D15: heuristic xác định đề bị giám sát — placement luôn bật, bank tiếng Anh bật.
  const proctored =
    proctoredProp ?? (kind === "PLACEMENT_TEST" || isEnglishBank(examBankId));

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

  // ── D15 proctoring state ────────────────────────────────────────────
  const [armed, setArmed] = useState(!proctored); // đã bấm "Bắt đầu làm bài"
  const [violations, setViolations] = useState(0);
  const [warnOpen, setWarnOpen] = useState(false);
  const [warnLeft, setWarnLeft] = useState(WARN_SECONDS);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [fsSupported, setFsSupported] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const violationsRef = useRef(0);
  const warnOpenRef = useRef(false); // gộp các event cùng 1 "episode" rời màn hình
  const sessionRef = useRef<ExamSession | null>(null);
  const demoRef = useRef(false);
  const expiredRef = useRef(false);
  const submittingRef = useRef(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef(answers);
  // Ref để effect fullscreenchange gọi được handleSubmit mới nhất.
  const handleSubmitRef = useRef<((violations?: number) => Promise<void>) | null>(
    null,
  );
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    demoRef.current = demo;
  }, [demo]);
  useEffect(() => {
    expiredRef.current = expired;
  }, [expired]);
  useEffect(() => {
    warnOpenRef.current = warnOpen;
  }, [warnOpen]);

  // Autosave ngay lập tức (dùng khi vi phạm — không đợi debounce 1.5s).
  const flushSave = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || demoRef.current || expiredRef.current) return;
    const entries = Object.entries(answersRef.current)
      .filter(([, v]) => isAnswered(v))
      .map(([questionId, v]) => ({ questionId, value: v as AnswerValue }));
    if (entries.length === 0) return;
    try {
      await saveExamProgress(s.id, entries);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, []);

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
    setArmed(!proctored);
    setViolations(0);
    violationsRef.current = 0;
    setWarnOpen(false);
    setAutoSubmitted(false);
    setPauseOpen(false);
    try {
      // E1 — resume: còn session IN_PROGRESS backend trả lại session cũ.
      const { session: s } = await startExam({
        ...(examBankId ? { examBankId } : {}),
        kind,
      });
      // E2 v1.1 (D16): progress autosave → khôi phục câu đã trả lời sau reload.
      const res = await getExamQuestions(s.id);
      setSession(s);
      setQuestions(
        res.items.map((it) => ({
          id: it.questionId,
          type: it.type,
          stem: it.stem,
          options: it.options,
          media: it.media,
        })),
      );
      if (res.progress && res.progress.length > 0) {
        const restored: AnswerMap = {};
        for (const p of res.progress) restored[p.questionId] = (p.value ?? null) as AnswerValue;
        setAnswers(restored);
        // Nhảy tới câu đầu tiên CHƯA trả lời để tiếp tục mạch thi.
        const firstUnanswered = res.items.findIndex((it) => !isAnswered(restored[it.questionId] ?? null));
        setCurrent(firstUnanswered === -1 ? 0 : firstUnanswered);
      }
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
        remainingSec: DEMO_EXAM.durationSec, // shared v1.1 — ExamSession bắt buộc
      });
      setQuestions(
        DEMO_EXAM.questions.map((q) => ({ id: q.id, type: q.type, stem: q.stem, options: q.options })),
      );
      setPhase("ready");
    }
  }, [examBankId, kind, proctored]);

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

  // ── D15: fullscreen API khả năng + listeners ────────────────────────
  useEffect(() => {
    setFsSupported(
      typeof document !== "undefined" &&
        "fullscreenEnabled" in document &&
        document.fullscreenEnabled === true,
    );
  }, []);

  /** Đăng ký 1 lần vi phạm (gộp nhiều event cùng lúc — 1 episode đếm 1). */
  const registerViolation = useCallback(() => {
    if (!proctored || !armed) return;
    if (phase !== "ready" || expiredRef.current || submittingRef.current) return;
    if (warnOpenRef.current) return; // đang trong 1 episode → không đếm kép
    violationsRef.current += 1;
    setViolations(violationsRef.current);
    setWarnOpen(true);
    setWarnLeft(WARN_SECONDS);
    void flushSave(); // vi phạm đồng thời autosave (task D15)
    if (violationsRef.current >= VIOLATION_LIMIT) {
      // Đủ 3 lần → tự nộp bài kèm violations.
      setWarnOpen(false);
      setAutoSubmitted(true);
      void handleSubmitRef.current?.(violationsRef.current);
    }
  }, [proctored, armed, phase, flushSave]);

  // Overlay cảnh báo đếm ngược 5s — quay lại màn hình là tự tắt.
  useEffect(() => {
    if (!warnOpen) return;
    const id = setInterval(() => setWarnLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [warnOpen]);

  const dismissWarn = useCallback(() => {
    setWarnOpen(false);
    setWarnLeft(WARN_SECONDS);
  }, []);

  useEffect(() => {
    if (!proctored || !armed || phase !== "ready") return;
    const onFsChange = () => {
      if (document.fullscreenElement) {
        if (warnOpenRef.current) dismissWarn(); // đã quay lại FS → tắt cảnh báo
      } else {
        registerViolation(); // thoát FS → vi phạm
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        registerViolation(); // chuyển tab → vi phạm
      } else if (warnOpenRef.current && !fsSupported) {
        dismissWarn(); // chế độ degrade (không FS) — quay lại tab là tắt
      }
    };
    const blockForDe = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const inField = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (inField) return; // không chặn thao tác trong ô điền
      e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "x" || e.key === "C" || e.key === "X")) {
        const t = e.target as HTMLElement | null;
        if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA") return;
        e.preventDefault();
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("contextmenu", blockForDe);
    document.addEventListener("copy", blockForDe);
    document.addEventListener("cut", blockForDe);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("contextmenu", blockForDe);
      document.removeEventListener("copy", blockForDe);
      document.removeEventListener("cut", blockForDe);
      document.removeEventListener("keydown", onKey);
    };
  }, [proctored, armed, phase, registerViolation, dismissWarn, fsSupported]);

  const answeredCount = useMemo(
    () => questions.filter((q) => isAnswered(answers[q.id] ?? null)).length,
    [questions, answers],
  );
  const total = questions.length;

  const onExpire = useCallback(() => setExpired(true), []);

  // A11y — focus trap + Escape cho 2 modal xác nhận (overlay proctoring KHÔNG Escape-close).
  const closeConfirm = useCallback(() => setConfirmOpen(false), []);
  const closePause = useCallback(() => setPauseOpen(false), []);
  const confirmTrapRef = useFocusTrap(confirmOpen, closeConfirm);
  const pauseTrapRef = useFocusTrap(pauseOpen, closePause);

  async function handleSubmit(violationCount = violations) {
    if (!session || submittingRef.current) return;
    setConfirmOpen(false);
    setPauseOpen(false);
    setSubmitting(true);
    submittingRef.current = true;
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
          violations: violationCount,
        });
        setResult(res);
        onSubmitted?.(res);
      }
      // Rời fullscreen khi thoát phòng thi (best-effort).
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
      setPhase("result");
      setShowCelebration(true);
    } catch (err) {
      setError(friendlyApiMessage(err));
      setAutoSubmitted(false);
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  });

  function retry() {
    setShowCelebration(false);
    void init();
  }

  function review() {
    setShowCelebration(false);
    document.getElementById("exam-review")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** Bắt đầu làm bài (D15): fullscreen cần user gesture → gọi tại đây. */
  function beginExam() {
    if (proctored && fsSupported && containerRef.current) {
      void containerRef.current.requestFullscreen().catch(() => undefined);
    }
    setArmed(true);
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

  // ── D15: cổng "Bắt đầu làm bài" trước khi vào đề (fullscreen cần gesture) ──
  if (phase === "ready" && proctored && !armed) {
    return (
      <div ref={containerRef} className="flex flex-col gap-4">
        <div className="rounded-[16px] border border-ink-300/30 bg-paper p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-6 shrink-0 text-honey-500" aria-hidden />
            <div className="flex flex-col gap-2 text-[15px] text-ink-700">
              <h2 className="text-lg font-bold text-ink-900">Phòng thi có giám sát nhẹ nha 🛡️</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>Bài thi sẽ mở <strong className="font-semibold">toàn màn hình</strong> để bạn tập trung.</li>
                <li>Thoát toàn màn hình hoặc chuyển tab <strong className="font-semibold">3 lần</strong> → bài được nộp tự động (không trừ điểm, nhưng sẽ ghi lại cho bạn biết).</li>
                <li>Chuột phải / copy trên đề bị khoá — điền đáp án bình thường nha.</li>
                {!fsSupported ? (
                  <li className="text-coral-600">
                    Trình duyệt này không hỗ trợ toàn màn hình (vd iOS Safari) — bài thi vẫn theo dõi
                    việc chuyển tab như bình thường nhé.
                  </li>
                ) : null}
              </ul>
              <Button size="lg" className="mt-2 w-fit" onClick={beginExam}>
                <Check aria-hidden /> Bắt đầu làm bài
              </Button>
            </div>
          </div>
        </div>
        {demoNotice ? (
          <p className="flex items-start gap-2 rounded-[12px] border border-dashed border-honey-300 bg-honey-50 px-4 py-3 text-sm text-ink-700">
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
      </div>
    );
  }

  if (phase === "ready" && q) {
    const durationSec = session?.durationSec ?? DEMO_EXAM.durationSec;
    return (
      <div
        ref={containerRef}
        onContextMenu={
          proctored && armed ? (e) => e.preventDefault() : undefined
        }
        className={cn(
          "flex flex-col gap-5",
          // D15: ẩn selection trên đề, trừ ô input/textarea (vẫn paste/điền bình thường).
          proctored && armed && "select-none [&_input]:select-text [&_textarea]:select-text",
        )}
      >
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
            {proctored && armed && violations > 0 ? (
              <span className="flex items-center gap-1 rounded-full bg-coral-50 px-3 py-1 text-sm font-semibold text-coral-600">
                <ShieldAlert className="size-4" aria-hidden />
                Rời màn hình {violations}/{VIOLATION_LIMIT} lần
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
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
            {proctored && armed ? (
              <Button variant="outline" size="sm" onClick={() => setPauseOpen(true)} disabled={submitting || expired}>
                Tạm dừng thi
              </Button>
            ) : null}
          </div>
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

        {proctored && armed && !fsSupported ? (
          <p className="flex items-center gap-2 rounded-[12px] bg-cream-deep px-4 py-3 text-sm text-ink-700">
            <MonitorX className="size-4 shrink-0" aria-hidden />
            Trình duyệt không hỗ trợ toàn màn hình — bài thi vẫn được theo dõi khi bạn chuyển tab nhé.
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
            ref={confirmTrapRef}
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
                <Button variant="coral" onClick={() => void handleSubmit()}>
                  <Send aria-hidden /> Nộp bài
                </Button>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  Làm tiếp
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* D15: confirm "Tạm dừng thi" — tự nộp chủ động với violations hiện có */}
        {pauseOpen ? (
          <div
            ref={pauseTrapRef}
            role="dialog"
            aria-modal="true"
            aria-label="Tạm dừng thi"
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/30 p-4 backdrop-blur-[2px] animate-fade-in"
          >
            <div className="w-full max-w-sm rounded-[16px] bg-paper p-6 text-center shadow-[0_8px_32px_rgba(0,0,0,0.08)] animate-pop-in">
              <h2 className="text-lg font-bold text-ink-900">Tạm dừng thi?</h2>
              <p className="mt-2 text-[15px] text-ink-700">
                Bấm tiếp tục là bài sẽ được <strong className="font-semibold">nộp luôn</strong> với{" "}
                {violations} lần rời màn hình — không mất bài làm nhưng không làm tiếp được nha.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button variant="coral" onClick={() => void handleSubmit()}>
                  <Send aria-hidden /> Nộp bài & kết thúc
                </Button>
                <Button variant="outline" onClick={() => setPauseOpen(false)}>
                  Làm tiếp
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* D15: overlay cảnh báo khi thoát FS / chuyển tab — role=alertdialog,
            KHÔNG có Escape-close (a11y TASK-007: không cho phép bỏ qua cảnh báo). */}
        {warnOpen ? (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Cảnh báo rời màn hình thi"
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-ink-900/90 p-6 text-center text-white animate-fade-in"
          >
            <ShieldAlert className="size-10 text-honey-400" aria-hidden />
            <h2 className="text-xl font-bold">Bạn vừa rời khỏi màn hình thi!</h2>
            <p className="max-w-md text-[15px] text-white/85">
              Quay lại bài thi trong <strong className="font-semibold text-honey-300">{warnLeft}s</strong> nha.
              Vi phạm lần {violations}/{VIOLATION_LIMIT} — đủ 3 lần bài sẽ được nộp tự động.
            </p>
            <Button variant="honey" onClick={dismissWarn}>
              Tôi đã quay lại rồi
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  // ── Phase result: celebration (D8/D9 tái dùng) + review perQuestion ──
  if (phase === "result" && result) {
    return (
      <div className="flex flex-col gap-5">
        {autoSubmitted ? (
          <p role="alert" className="flex items-center gap-2 rounded-[12px] bg-coral-50 px-4 py-3 text-sm font-medium text-coral-600">
            <ShieldAlert className="size-4 shrink-0" aria-hidden />
            Bài được nộp tự động sau 3 lần rời màn hình.
          </p>
        ) : null}
        {!demo && violations > 0 ? (
          <p className="rounded-[12px] bg-cream-deep px-4 py-3 text-sm text-ink-700">
            Số lần rời màn hình bị ghi nhận: <strong className="font-semibold">{violations}</strong> (thông tin
            cho bạn và admin — không ảnh hưởng điểm ở bản này).
          </p>
        ) : null}

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
          {examBankId ? (
            <Link
              href={`/exams/${encodeURIComponent(examBankId)}/history`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[12px] px-4 text-[15px] font-semibold text-teal-fresh-600 underline-offset-4 transition-colors duration-200 hover:underline"
            >
              Xem lịch sử thi
            </Link>
          ) : null}
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
