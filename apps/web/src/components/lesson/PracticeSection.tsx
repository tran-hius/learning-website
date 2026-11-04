"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";import { QuizCard } from "@/components/quiz/QuizCard";
import { ResultCelebration } from "@/components/feedback/ResultCelebration";
import { submitPracticeAttempt, getHint, normalizeAnswer } from "@/lib/api/practice";
import { friendlyApiMessage } from "@/lib/api/client";
import type { AnswerValue, PracticeAttemptResult, QuestionPublic } from "@/lib/api/types";
import type { DemoQuestion } from "@/lib/demo/demo-lesson";

/**
 * Khối thực hành cuối bài: 1+ card quiz + nộp (P1) + celebration.
 * Backend chưa chạy → chấm local bằng demoAnswers (demo mode rõ ràng).
 * TASK-005 sẽ tái dùng cùng flow này cho phần thi.
 */

export interface PracticeSectionProps {
  setId: string | null; // null = demo mode
  mode: string;
  questions: QuestionPublic[];
  /** Demo mode: đáp án + giải thích + hints đầy đủ nằm ở client. */
  demoQuestions?: Record<string, DemoQuestion>;
  /** Demo mode: nếu true, hiển thị nhãn demo (banner do trang render ngoài). */
  isDemo: boolean;
  /** Sau khi celebration đóng: vị trí scroll "Ôn lại" (mục Cách tư duy). */
  reviewTargetId?: string;
  lessonId: string;
  nextLesson?: { slug: string; title: string } | null;
}

type AnswerMap = Record<string, AnswerValue | null>;

/** Chấm local cho demo mode (đáp án demo nằm client, KHÔNG dùng khi online). */
function gradeDemo(answers: AnswerMap, demo: Record<string, DemoQuestion>) {
  const results = Object.entries(answers).map(([questionId, value]) => {
    const q = demo[questionId];
    if (!q) {
      return { questionId, isCorrect: false, correctAnswer: "", explanation: "Câu này hết dữ liệu demo rồi nha.", thinkingHints: [] };
    }
    const norm = normalizeAnswer(value ?? "");
    const expected = normalizeAnswer(q.answer) ?? "";
    let isCorrect = false;
    if (Array.isArray(expected) && Array.isArray(norm)) {
      isCorrect = expected.join("|") === norm.join("|");
    } else if (typeof expected === "string" && typeof norm === "string") {
      isCorrect = expected.toLowerCase() === norm.toLowerCase();
    } else if (Array.isArray(expected) && typeof norm === "string") {
      isCorrect = expected.some((e) => e.toLowerCase() === norm.toLowerCase());
    }
    const label = (v: string | string[]) =>
      Array.isArray(v)
        ? v
            .map((id) => q.options.find((o) => o.id === id)?.content ?? id)
            .join(", ")
        : q.options.find((o) => o.id === v)?.content ?? v;
    return {
      questionId,
      isCorrect,
      correctAnswer: Array.isArray(q.answer) ? q.answer.map(label).join(", ") : label(q.answer as string),
      explanation: q.explanation,
      thinkingHints: q.thinkingHints,
    };
  });
  const correctCount = results.filter((r) => r.isCorrect).length;
  return {
    results,
    xpEarned: correctCount * 2,
    accuracy: results.length ? correctCount / results.length : 0,
  } satisfies PracticeAttemptResult & { results: Array<{ thinkingHints: string[] }> };
}

export function PracticeSection({
  setId,
  mode,
  questions,
  demoQuestions = {},
  isDemo,
  reviewTargetId = "thinking-section",
  lessonId,
  nextLesson,
}: PracticeSectionProps) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [attempt, setAttempt] = useState<PracticeAttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const total = questions.length;
  const answeredCount = useMemo(
    () => questions.filter((q) => normalizeAnswer(answers[q.id] ?? "") !== null).length,
    [answers, questions],
  );
  const allAnswered = total > 0 && answeredCount === total;

  const resultByQuestion = useMemo(() => {
    const map: Record<string, PracticeAttemptResult["results"][number]> = {};
    for (const r of attempt?.results ?? []) map[r.questionId] = r;
    return map;
  }, [attempt]);

  const percent = attempt ? Math.round((attempt.accuracy || 0) * 100) : 0;
  const scoreLabel = attempt ? `${attempt.results.filter((r) => r.isCorrect).length}/${total}` : "";

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    let attempt: PracticeAttemptResult | null = null;
    try {
      if (setId && !isDemo) {
        try {
          attempt = await submitPracticeAttempt(
            setId,
            {
              answers: questions
                .map((q) => ({ questionId: q.id, value: answers[q.id] }))
                .filter((a): a is { questionId: string; value: AnswerValue } => a.value !== null),
            },
          );
        } catch (err) {
          // P1 đã mount (TASK-004) — API 200 ưu tiên; lỗi (chưa đăng nhập, server
          // dừng...) → rơi về chấm local demo nếu có dữ liệu demo, không bịa điểm.
          if (questions.every((q) => demoQuestions[q.id])) {
            attempt = gradeDemo(answers, demoQuestions) as PracticeAttemptResult;
            setError(`Server chấm bài chưa chạy (${friendlyApiMessage(err)}) — tạm chấm bằng dữ liệu demo.`);
          } else {
            setError(friendlyApiMessage(err));
            return;
          }
        }
      } else {
        // Demo mode — chấm local, banner demo do trang render ngoài.
        attempt = gradeDemo(answers, demoQuestions) as PracticeAttemptResult;
      }
      setAttempt(attempt);
      setShowCelebration(true);
    } finally {
      setSubmitting(false);
    }
  }

  function retry() {
    setAttempt(null);
    setAnswers({});
    setShowCelebration(false);
    setError(null);
  }

  function review() {
    setShowCelebration(false);
    document.getElementById(reviewTargetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleComplete() {
    setCompleteLoading(true);
    setCompleteError(null);
    try {
      if (isDemo || lessonId.startsWith("demo-")) {
        // Demo: không gọi L1 (sẽ 401/404) — mô phỏng phản hồi thành công.
        await new Promise((r) => setTimeout(r, 400));
        setCompleted(true);
      } else {
        const { completeLesson } = await import("@/lib/api/subjects");
        await completeLesson(lessonId);
        setCompleted(true);
      }
    } catch (err) {
      setCompleteError(friendlyApiMessage(err));
    } finally {
      setCompleteLoading(false);
    }
  }

  if (total === 0) return null;

  return (
    <section id="practice" aria-label="Thực hành" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-ink-900">
          Thực hành ngay {mode === "QUIZ" ? "" : `· ${mode.toLowerCase()}`}
        </h2>
        {/* Vòng tiến triển: đã trả lời bao nhiêu câu */}
        <div
          className="flex items-center gap-2 rounded-full bg-cream-deep px-3 py-1.5 text-sm font-medium text-ink-700"
          aria-label={`Đã trả lời ${answeredCount}/${total} câu`}
        >
          <svg viewBox="0 0 36 36" className="size-6 -rotate-90" aria-hidden>
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-ink-300)" strokeOpacity="0.4" strokeWidth="4" />
            <circle
              cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-teal-fresh-400)" strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(answeredCount / total) * 97.4} 97.4`}
              className="transition-all duration-300 ease-out"
            />
          </svg>
          {answeredCount}/{total}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {questions.map((q, i) => (
          <QuizCard
            key={q.id}
            question={q}
            index={i}
            total={total}
            value={answers[q.id] ?? null}
            onChange={(id, value) => setAnswers((prev) => ({ ...prev, [id]: value }))}
            result={resultByQuestion[q.id]}
            hintLevel1={demoQuestions[q.id]?.thinkingHints[0] ?? (q as QuestionPublic & { thinkingHints?: string[] }).thinkingHints?.[0]}
            requestHintLevel2={async () => {
              // Online: P2. Demo hoặc P2 chưa có → hint bậc 2 local.
              if (setId && !isDemo) {
                try {
                  return (await getHint(q.id, 2)).hint;
                } catch {
                  /* rơi xuống demo hint bên dưới */
                }
              }
              return demoQuestions[q.id]?.thinkingHints[1] ?? "Gợi ý bậc 2 sẽ có sau khi backend chạy nhé!";
            }}
            disabled={submitting}
          />
        ))}
      </div>

      {error ? (
        <p role="alert" className="rounded-[12px] bg-coral-50 px-4 py-3 text-sm text-coral-600">
          {error}
        </p>
      ) : null}

      {/* Nút nộp / hoàn thành */}
      <div className="flex flex-wrap items-center gap-3">
        {!attempt ? (
          <Button size="lg" onClick={handleSubmit} disabled={!allAnswered || submitting}>
            {submitting ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
            Nộp bài
          </Button>
        ) : null}
        {attempt ? (
          <Button size="lg" onClick={handleComplete} disabled={completed || completeLoading}>
            {completeLoading ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
            {completed ? "Đã hoàn thành ✓" : "Hoàn thành bài"}
          </Button>
        ) : null}
        {nextLesson ? (
          <Link
            href={`/lessons/${nextLesson.slug}`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[12px] px-4 text-[15px] font-semibold text-teal-fresh-600 underline-offset-4 transition-colors duration-200 hover:underline"
          >
            Bài tiếp theo: {nextLesson.title}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>

      {completeError ? (
        <p role="alert" className="text-sm text-coral-600">
          {completeError}
        </p>
      ) : null}
      {completed ? (
        isDemo ? (
          // D9: demo text trung thực — không hứa +10 XP khi chưa kết nối server.
          <p className="flex items-center gap-2 rounded-[12px] bg-mint-100 px-4 py-3 text-sm font-medium text-mint-600 animate-pop-in">
            <Check className="size-4 animate-bounce-once" aria-hidden />
            Hoàn thành bài! XP sẽ được ghi khi kết nối máy chủ
          </p>
        ) : (
          <p className="flex items-center gap-2 rounded-[12px] bg-mint-100 px-4 py-3 text-sm font-medium text-mint-600 animate-pop-in">
            <Check className="size-4 animate-bounce-once" aria-hidden />
            Ghi nhận rồi nè — +10 XP vào ví streak của bạn! 🎉
          </p>
        )
      ) : null}

      {showCelebration && attempt ? (
        <ResultCelebration
          percent={percent}
          scoreLabel={scoreLabel}
          onClose={() => setShowCelebration(false)}
          onRetry={percent < 70 ? retry : undefined}
          onReview={percent < 70 ? review : undefined}
        />
      ) : null}
    </section>
  );
}

// Wrapper nhẹ để trang chủ đề có thể chèn khối practice trong Card thống nhất.
export function PracticeSectionCard(props: PracticeSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Luyện tập</CardTitle>
      </CardHeader>
      <CardContent>
        <PracticeSection {...props} />
      </CardContent>
    </Card>
  );
}
