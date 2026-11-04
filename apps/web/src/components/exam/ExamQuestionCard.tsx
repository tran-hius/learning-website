"use client";

import { Image as ImageIcon, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MarkdownContent } from "@/lib/markdown";
import { MatchPairsForm, type PairValue } from "./MatchPairsForm";
import type { AnswerValue, QuestionOption, QuestionType } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Card câu hỏi thi — "bản nhẹ" của QuizCard (task TASK-005 mục 2):
 * KHÔNG có gợi ý (E2 ẩn thinkingHints/explanation theo contract 3.2), hỗ trợ
 * MCQ_SINGLE / MCQ_MULTI / LISTEN_MCQ / FILL_ANSWER / MATCH_PAIRS.
 * Sau khi nộp dùng để review đúng/sai qua `result`.
 */

export interface ExamQuestionCardProps {
  question: {
    id: string;
    type: QuestionType;
    stem: string;
    options: QuestionOption[];
    media?: { imageUrls?: string[]; audioUrl?: string };
  };
  index: number;
  total: number;
  value: AnswerValue | null;
  onChange: (questionId: string, value: AnswerValue | null) => void;
  disabled?: boolean;
  /** Kết quả sau nộp (review) — correctAnswer giữ nguyên JSON từ E4 (ids/pairs/text). */
  result?: {
    isCorrect: boolean;
    correctAnswer: unknown;
    explanation: string | null;
  };
}

const TYPE_LABEL: Record<string, string> = {
  MCQ_SINGLE: "Chọn 1 đáp án",
  MCQ_MULTI: "Chọn nhiều đáp án",
  FILL_ANSWER: "Điền đáp án",
  MATCH_PAIRS: "Nối cặp",
  LISTEN_MCQ: "Nghe + chọn đáp án",
};

export function ExamQuestionCard({
  question,
  index,
  total,
  value,
  onChange,
  disabled,
  result,
}: ExamQuestionCardProps) {
  const revealed = !!result;
  const isMulti = question.type === "MCQ_MULTI";
  const isPairs = question.type === "MATCH_PAIRS";
  const selectedIds: string[] = isMulti && Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : typeof value === "string" && !isPairs
      ? [value]
      : [];
  const answered = isPairs
    ? Array.isArray(value) && value.length > 0
    : question.type === "FILL_ANSWER"
      ? !!value
      : selectedIds.length > 0;

  function toggleOption(optionId: string) {
    if (disabled || revealed) return;
    if (isMulti) {
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
      // E4 trả correctOptionIds (mảng id) cho MCQ — so theo id option.
      const correctSet = new Set(
        (Array.isArray(result!.correctAnswer) ? result!.correctAnswer : []).map((s) => String(s)),
      );
      if (correctSet.has(optionId)) return "correct";
      if (selectedIds.includes(optionId)) return "wrong";
      return "idle";
    }
    return selectedIds.includes(optionId) ? "selected" : "idle";
  };

  return (
    <div className="flex flex-col gap-4 rounded-[16px] border border-ink-300/30 bg-paper p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <Badge variant="outline">{TYPE_LABEL[question.type] ?? question.type}</Badge>
      </div>

      <MarkdownContent markdown={question.stem} />

      {/* Media (hình + audio nghe nếu LISTEN_MCQ) */}
      {question.media?.imageUrls?.length ? (
        <div className="flex flex-wrap gap-3">
          {question.media.imageUrls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt="Hình minh hoạ câu hỏi"
              className="max-h-56 rounded-[12px] border border-ink-300/30 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
            />
          ))}
        </div>
      ) : null}
      {question.media?.audioUrl ? (
        <div className="flex items-center gap-2 rounded-[12px] bg-cream-deep px-3 py-2">
          <Volume2 className="size-4 shrink-0 text-sky-500" aria-hidden />
          <audio controls preload="metadata" src={question.media.audioUrl} className="h-10 w-full max-w-sm" />
        </div>
      ) : null}
      {!question.media?.audioUrl && question.media?.imageUrls?.length ? (
        <p className="flex items-center gap-1.5 text-sm text-ink-500">
          <ImageIcon className="size-4" aria-hidden /> Câu hỏi kèm hình bên trên
        </p>
      ) : null}

      {isPairs ? (
        <MatchPairsForm
          options={question.options}
          value={(Array.isArray(value) && value.every((v) => typeof v === "object")
            ? (value as PairValue[])
            : null)}
          onChange={(v) => onChange(question.id, v)}
          disabled={disabled}
          revealed={revealed}
          correctPairs={result ? parsePairAnswer(result.correctAnswer) : []}
        />
      ) : question.type === "FILL_ANSWER" ? (
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
              <strong className="font-semibold text-mint-600">
                {typeof result!.correctAnswer === "string" ? result!.correctAnswer : JSON.stringify(result!.correctAnswer)}
              </strong>
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
                  state === "idle" &&
                    "border-ink-300/50 bg-paper hover:border-teal-fresh-400 hover:bg-teal-fresh-50/50",
                  state === "selected" && "border-teal-fresh-400 bg-teal-fresh-50",
                  state === "correct" && "border-mint-400 bg-mint-100/60",
                  state === "wrong" && "border-coral-500 bg-coral-50",
                  "disabled:cursor-default",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-200",
                    isMulti && "rounded-[8px]",
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

      {/* Giải thích sau khi nộp (perQuestion — E4) */}
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

/** correctAnswer từ E4 là unknown/JSON — parse về PairValue[] cho MATCH_PAIRS. */
export function parsePairAnswer(correctAnswer: unknown): PairValue[] {
  if (!Array.isArray(correctAnswer)) return [];
  return correctAnswer.filter(
    (p): p is PairValue =>
      typeof p === "object" && p !== null &&
      typeof (p as PairValue).leftId === "string" && typeof (p as PairValue).rightId === "string",
  );
}
