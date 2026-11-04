"use client";

import { useState } from "react";
import { Lightbulb, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "@/lib/markdown";
import type { AnswerValue, QuestionPublic } from "@/lib/api/types";
import type { PracticeQuestionResult } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Card câu hỏi trắc nghiệm tái dùng (practice lẫn thi):
 * - MCQ_SINGLE: chọn 1 · MCQ_MULTI: chọn nhiều · FILL_ANSWER: điền.
 * - Gợi ý bậc 1→2: bậc 1 có sẵn từ payload bài học; bậc 2 gọi P2 (demo: lấy từ
 *   hints[1] local). Mỗi bậc chỉ mở sau khi bấm.
 * - Sau khi nộp: nhận result (P1 hoặc chấm local demo) → tô đúng/sai +
 *   giải thích (guide: feedback tức thị, transition 150–250ms).
 */

const DIFFICULTY_BADGE = {
  EASY: { label: "Dễ", variant: "mint" },
  MEDIUM: { label: "Vừa", variant: "honey" },
  HARD: { label: "Khó", variant: "coral" },
} as const;

export interface QuizCardProps {
  question: QuestionPublic;
  index: number;
  total: number;
  value: AnswerValue | null;
  onChange: (questionId: string, value: AnswerValue | null) => void;
  /** Kết quả sau khi nộp (undefined = đang làm). */
  result?: PracticeQuestionResult;
  /** Bậc 1 (từ payload). */
  hintLevel1?: string;
  /** Lấy hint bậc 2 (P2 online / demo local) — trả về text gợi ý. */
  requestHintLevel2: () => Promise<string>;
  disabled?: boolean;
}

export function QuizCard({
  question,
  index,
  total,
  value,
  onChange,
  result,
  hintLevel1,
  requestHintLevel2,
  disabled,
}: QuizCardProps) {
  const [hintLevel, setHintLevel] = useState(0); // 0: chưa mở, 1, 2
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);

  const selectedIds: string[] = Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : value
      ? [String(value)]
      : [];
  const answered = question.type === "FILL_ANSWER" ? !!value : selectedIds.length > 0;
  const revealed = !!result;

  async function nextHint() {
    if (hintLevel === 0 && hintLevel1) {
      setHintLevel(1);
      setHintText(hintLevel1);
      return;
    }
    if (hintLevel >= 1) {
      setHintLoading(true);
      try {
        const hint = await requestHintLevel2();
        setHintLevel(2);
        setHintText(hint);
      } finally {
        setHintLoading(false);
      }
    }
  }

  function toggleOption(optionId: string) {
    if (disabled || revealed) return;
    if (question.type === "MCQ_MULTI") {
      const next = selectedIds.includes(optionId)
        ? selectedIds.filter((id) => id !== optionId)
        : [...selectedIds, optionId];
      onChange(question.id, next.length ? next : null);
    } else {
      onChange(question.id, optionId);
    }
  }

  const optionState = (optionId: string): "idle" | "selected" | "correct" | "wrong" => {
    if (revealed) {
      const correctSet = new Set(
        (Array.isArray(result!.correctAnswer)
          ? result!.correctAnswer
          : [result!.correctAnswer]
        ).map((s) => String(s)),
      );
      if (correctSet.has(optionId)) return "correct";
      if (selectedIds.includes(optionId)) return "wrong";
      return "idle";
    }
    return selectedIds.includes(optionId) ? "selected" : "idle";
  };

  return (
    <div className="flex flex-col gap-4 rounded-[16px] border border-ink-300/30 bg-paper p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-6">
      {/* Header: vòng tiến triển + độ khó */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-full border-2 text-sm font-semibold",
              answered && !revealed && "border-teal-fresh-400 bg-teal-fresh-50 text-teal-fresh-600",
              revealed &&
                (result!.isCorrect
                  ? "border-mint-400 bg-mint-100 text-mint-600"
                  : "border-coral-500 bg-coral-100 text-coral-600"),
              !answered && !revealed && "border-ink-300/60 text-ink-500",
            )}
          >
            {revealed ? (result!.isCorrect ? "✓" : "✗") : index + 1}
          </span>
          <span className="text-sm text-ink-500">
            Câu {index + 1}/{total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={DIFFICULTY_BADGE[question.difficulty].variant}>
            {DIFFICULTY_BADGE[question.difficulty].label}
          </Badge>
          <Badge variant="outline">
            {question.type === "MCQ_SINGLE"
              ? "Chọn 1 đáp án"
              : question.type === "MCQ_MULTI"
                ? "Chọn nhiều đáp án"
                : "Điền đáp án"}
          </Badge>
        </div>
      </div>

      <MarkdownContent markdown={question.stem} />

      {/* Options / input */}
      {question.type === "FILL_ANSWER" ? (
        <div>
          <label className="sr-only" htmlFor={`fill-${question.id}`}>
            Đáp án của câu {index + 1}
          </label>
          <input
            id={`fill-${question.id}`}
            type="text"
            inputMode="text"
            disabled={disabled || revealed}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(question.id, e.target.value === "" ? null : e.target.value)}
            placeholder="Điền đáp án vào đây…"
            className={cn(
              "min-h-[44px] w-full rounded-[10px] border bg-paper px-3 py-2 text-[15px] text-ink-900 outline-none transition-colors duration-200 placeholder:text-ink-300",
              !revealed && "border-ink-300/60 focus:border-teal-fresh-400",
              revealed &&
                (result!.isCorrect
                  ? "border-mint-400 bg-mint-100/40"
                  : "border-coral-500 bg-coral-50"),
            )}
          />
          {revealed && !result!.isCorrect ? (
            <p className="mt-1.5 text-sm text-ink-700">
              Đáp án đúng:{" "}
              <strong className="font-semibold text-mint-600">{result!.correctAnswer}</strong>
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-2" role="group" aria-label={`Các lựa chọn câu ${index + 1}`}>
          {question.options.map((opt, i) => {
            const state = optionState(opt.id);
            const letter = String.fromCharCode(65 + i);
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled || revealed}
                onClick={() => toggleOption(opt.id)}
                aria-pressed={selectedIds.includes(opt.id)}
                className={cn(
                  "flex min-h-[44px] items-center gap-3 rounded-[12px] border px-3 py-2.5 text-left text-[15px] transition-all duration-200 ease-out",
                  state === "idle" && "border-ink-300/50 bg-paper hover:border-teal-fresh-400 hover:bg-teal-fresh-50/50",
                  state === "selected" && "border-teal-fresh-400 bg-teal-fresh-50",
                  state === "correct" && "border-mint-400 bg-mint-100/60",
                  state === "wrong" && "border-coral-500 bg-coral-50",
                  "disabled:cursor-default",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-200",
                    question.type === "MCQ_MULTI" && "rounded-[8px]",
                    state === "idle" && "border-ink-300/60 text-ink-500",
                    state === "selected" && "border-teal-fresh-500 bg-teal-fresh-500 text-white",
                    state === "correct" && "border-mint-600 bg-mint-600 text-white",
                    state === "wrong" && "border-coral-500 bg-coral-500 text-white",
                  )}
                >
                  {state === "correct" ? "✓" : state === "wrong" ? "✗" : letter}
                </span>
                <MarkdownContent markdown={opt.content} />
              </button>
            );
          })}
        </div>
      )}

      {/* Hint bậc 1→2 */}
      {!revealed && hintLevel < 2 && (
        <div>
          <Button variant="ghost" size="sm" onClick={nextHint} disabled={hintLoading} className="px-0">
            {hintLoading ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Lightbulb aria-hidden />
            )}
            {hintLevel === 0 ? "Xin gợi ý (bậc 1)" : "Gợi ý sâu hơn (bậc 2)"}
          </Button>
          {hintText ? (
            <p className="mt-2 rounded-[12px] bg-honey-50 px-3 py-2 text-sm text-ink-700 animate-pop-in">
              💡 {hintText}
            </p>
          ) : null}
        </div>
      )}

      {/* Giải thích sau khi nộp */}
      {revealed && result!.explanation ? (
        <div className="rounded-[12px] bg-cream-deep px-4 py-3 text-[15px] animate-pop-in">
          <p className="mb-1 text-sm font-semibold text-ink-900">
            {result!.isCorrect ? "Chính xác! 🎉" : "Giải thích nè:"}
          </p>
          <MarkdownContent markdown={result!.explanation} />
        </div>
      ) : null}
    </div>
  );
}
