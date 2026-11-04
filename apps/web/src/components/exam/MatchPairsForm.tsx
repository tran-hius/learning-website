"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { MarkdownContent } from "@/lib/markdown";
import type { QuestionOption } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Form ghép cặp bằng NÚT CHỌN (task TASK-005: KHÔNG kéo-thả, không thêm thư
 * viện dnd): bấm 1 mục cột trái → bấm 1 mục cột phải để nối cặp; bấm lại để bỏ.
 * Value đúng contract P1/E4: Array<{leftId, rightId}> (id option).
 * Phân cột trái/phải theo quy ước seed `opt_l*` / `opt_r*`; nếu id không theo
 * quy ước thì chia nửa đầu/nửa sau (dữ liệu thật luôn theo seed hiện tại).
 */

export interface PairValue {
  leftId: string;
  rightId: string;
}

export interface MatchPairsFormProps {
  options: QuestionOption[];
  value: PairValue[] | null;
  onChange: (value: PairValue[] | null) => void;
  disabled?: boolean;
  /** Sau khi nộp: cặp đúng để tô ✓/✗ (không cho đổi đáp án). */
  revealed?: boolean;
  correctPairs?: PairValue[];
}

function splitSides(options: QuestionOption[]): { left: QuestionOption[]; right: QuestionOption[] } {
  const left = options.filter((o) => /^opt_l/.test(o.id));
  const right = options.filter((o) => /^opt_r/.test(o.id));
  if (left.length > 0 && right.length > 0 && left.length + right.length === options.length) {
    return { left, right };
  }
  const half = Math.ceil(options.length / 2);
  return { left: options.slice(0, half), right: options.slice(half) };
}

export function MatchPairsForm({
  options,
  value,
  onChange,
  disabled,
  revealed = false,
  correctPairs = [],
}: MatchPairsFormProps) {
  const { left, right } = useMemo(() => splitSides(options), [options]);
  const pairs = value ?? [];
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  const rightOf = (leftId: string): string | null => pairs.find((p) => p.leftId === leftId)?.rightId ?? null;
  const correctRightOf = (leftId: string): string | null =>
    correctPairs.find((p) => p.leftId === leftId)?.rightId ?? null;
  const leftOf = (rightId: string): string | null => pairs.find((p) => p.rightId === rightId)?.leftId ?? null;

  function pickLeft(id: string) {
    if (disabled || revealed) return;
    // Bấm lại mục trái đang chọn → bỏ chọn.
    setSelectedLeft((cur) => (cur === id ? null : id));
  }

  function pickRight(rightId: string) {
    if (disabled || revealed) return;
    if (!selectedLeft) {
      // Chưa chọn cột trái: bấm phải → bỏ cặp có phải này (nếu có).
      const next = pairs.filter((p) => p.rightId !== rightId);
      onChange(next.length ? next : null);
      return;
    }
    const next = pairs.filter((p) => p.leftId !== selectedLeft && p.rightId !== rightId);
    next.push({ leftId: selectedLeft, rightId });
    onChange(next);
    setSelectedLeft(null);
  }

  function removePair(leftId: string) {
    if (disabled || revealed) return;
    const next = pairs.filter((p) => p.leftId !== leftId);
    onChange(next.length ? next : null);
  }

  if (left.length === 0 || right.length === 0) return null;

  return (
    <div className="flex flex-col gap-3" role="group" aria-label="Ghép cặp — bấm mục trái rồi bấm mục phải để nối">
      <p className="text-sm text-ink-500">
        Bấm một mục ở cột trái, rồi bấm mục khớp ở cột phải để nối cặp nha.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Cột trái */}
        <div className="flex flex-col gap-2" aria-label="Cột trái">
          {left.map((opt) => {
            const connected = rightOf(opt.id);
            const isSelected = selectedLeft === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled || revealed}
                onClick={() => pickLeft(opt.id)}
                aria-pressed={isSelected}
                className={cn(
                  "flex min-h-[44px] items-center gap-2 rounded-[12px] border px-3 py-2 text-left text-[15px] transition-all duration-200 ease-out",
                  revealed
                    ? "cursor-default border-ink-300/40 bg-paper"
                    : isSelected
                      ? "border-teal-fresh-400 bg-teal-fresh-50"
                      : connected
                        ? "border-teal-fresh-300 bg-teal-fresh-50/60"
                        : "border-ink-300/50 bg-paper hover:border-teal-fresh-400 hover:bg-teal-fresh-50/50",
                )}
              >
                <MarkdownContent markdown={opt.content} />
              </button>
            );
          })}
        </div>

        {/* Cột phải */}
        <div className="flex flex-col gap-2" aria-label="Cột phải">
          {right.map((opt) => {
            const taken = leftOf(opt.id);
            const isCorrectSide = revealed && correctPairs.some((p) => p.rightId === opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled || revealed}
                onClick={() => pickRight(opt.id)}
                aria-pressed={!!taken}
                className={cn(
                  "flex min-h-[44px] items-center gap-2 rounded-[12px] border px-3 py-2 text-left text-[15px] transition-all duration-200 ease-out",
                  revealed
                    ? isCorrectSide
                      ? "border-mint-400 bg-mint-100/60"
                      : "border-ink-300/40 bg-paper"
                    : taken
                      ? "border-teal-fresh-300 bg-teal-fresh-50/60"
                      : "border-ink-300/50 bg-paper hover:border-teal-fresh-400 hover:bg-teal-fresh-50/50",
                )}
              >
                <MarkdownContent markdown={opt.content} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Danh sách cặp đã nối (+ đúng/sai sau khi nộp) */}
      <ul className="flex flex-col gap-1.5">
        {left.map((opt) => {
          const myRight = rightOf(opt.id);
          const correctRight = correctRightOf(opt.id);
          if (revealed) {
            const ok = myRight !== null && myRight === correctRight;
            const state = myRight === null ? "Chưa nối" : ok ? "Đúng ✓" : "Sai ✗";
            return (
              <li
                key={opt.id}
                className={cn(
                  "flex flex-wrap items-center gap-1.5 rounded-[10px] px-3 py-2 text-sm",
                  ok ? "bg-mint-100 text-mint-600" : "bg-coral-50 text-coral-600",
                )}
              >
                <span className="text-ink-900">{opt.content}</span>
                <span aria-hidden>→</span>
                <span>
                  {myRight ? options.find((o) => o.id === myRight)?.content ?? "?" : "(trống)"}
                </span>
                {!ok ? (
                  <span className="text-ink-500">
                    — đúng: {correctRight ? options.find((o) => o.id === correctRight)?.content ?? "?" : "?"} ({state})
                  </span>
                ) : null}
              </li>
            );
          }
          if (!myRight) return null;
          return (
            <li
              key={opt.id}
              className="flex items-center gap-2 rounded-[10px] bg-cream-deep px-3 py-2 text-sm text-ink-700"
            >
              <span className="text-ink-900">{opt.content}</span>
              <span aria-hidden>→</span>
              <span>{options.find((o) => o.id === myRight)?.content ?? "?"}</span>
              <button
                type="button"
                onClick={() => removePair(opt.id)}
                aria-label={`Bỏ cặp ${opt.content}`}
                className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px] text-ink-500 transition-colors duration-200 hover:bg-coral-50 hover:text-coral-600"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          );
        })}
        {pairs.length === 0 && !revealed ? (
          <li className="text-sm text-ink-500">Chưa nối cặp nào — ghép hết để đủ điểm nha.</li>
        ) : null}
      </ul>
    </div>
  );
}
