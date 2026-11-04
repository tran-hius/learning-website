"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { BookOpen, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mascot } from "./Mascot";
import { cn } from "@/lib/utils";

// D8: Lottie chỉ cho khoảnh khắc feedback quan trọng; bundle chính không chứa
// lottie (dynamic, ssr:false) và JSON chỉ fetch khi overlay mở (lazy-load).
const Lottie = dynamic(() => import("lottie-react").then((m) => m.Lottie), {
  ssr: false,
  loading: () => null,
}) as unknown as React.ComponentType<{
  animationData: unknown;
  loop?: boolean;
  autoplay?: boolean;
  style?: React.CSSProperties;
}>;

export interface ResultCelebrationProps {
  /** Phần trăm điểm 0–100. ≥70 → pháo hoa/mừng; <70 → động viên nhẹ. */
  percent: number;
  /** Nhãn điểm hiển thị, vd "9/10". */
  scoreLabel: string;
  onClose: () => void;
  /** Điểm thấp: bấm "Làm lại" → làm lại từ đầu (truyền undefined để ẩn). */
  onRetry?: () => void;
  /** Điểm thấp: nhãn + hành động "Ôn lại" (vd cuộn lên phần Cách tư duy). */
  reviewLabel?: string;
  onReview?: () => void;
}

/** Thông điệp "chê vui" đúng tone guide — chọn xoay vòng theo percent. */
const ENCOURAGEMENTS = [
  "Trượt chút xíu, thử lại nhé! 💪",
  "Gần đích rồi, nạp lại năng lượng đi nào ☕",
  "Sai là để hiểu sâu hơn — làm lại phát nữa nha!",
];

export function ResultCelebration({
  percent,
  scoreLabel,
  onClose,
  onRetry,
  reviewLabel = "Ôn lại",
  onReview,
}: ResultCelebrationProps) {
  const passed = percent >= 70;
  const [animationData, setAnimationData] = useState<unknown>(null);
  const [message] = useState(
    () => ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)],
  );

  // Lazy-load JSON chỉ khi overlay thật sự mở (file ≤150KB ở /public/animations).
  useEffect(() => {
    if (!passed) return;
    let alive = true;
    fetch("/animations/celebration-trophy.json")
      .then((r) => r.json())
      .then((data) => {
        if (alive) setAnimationData(data);
      })
      .catch(() => {
        /* mạng lỗi → vẫn còn mascot SVG mừng, không chặn overlay */
      });
    return () => {
      alive = false;
    };
  }, [passed]);

  // Esc để đóng.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const headline = passed ? "Tuyệt vời!" : "Gần rồi đó!";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={`Kết quả bài làm: ${scoreLabel}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/30 p-4 backdrop-blur-[2px] animate-fade-in"
    >
      <div
        className={cn(
          "relative flex max-w-md w-full flex-col items-center gap-3 rounded-[16px] bg-paper p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.08)] animate-pop-in",
          passed && "overflow-hidden",
        )}
      >
        {passed && animationData ? (
          <div
            aria-hidden
            className="pointer-events-none absolute -top-6 left-1/2 w-72 -translate-x-1/2"
          >
            <Lottie animationData={animationData} loop={false} autoplay style={{ width: "100%" }} />
          </div>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-3 top-3 rounded-[10px] p-2 text-ink-500 transition-colors duration-200 hover:bg-cream-deep hover:text-ink-900"
        >
          <X className="size-4" aria-hidden />
        </button>

        <Mascot mood={passed ? "cheer" : "encourage"} />

        <h2 className="text-xl font-bold text-ink-900">
          {headline} {scoreLabel} {passed ? "🎉" : ""}
        </h2>

        <p className="text-[15px] text-ink-700">
          {passed
            ? "Bạn đã nắm chắc phần này — tiếp tục giữ nhịp học đều đều nha!"
            : message}
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {passed ? (
            <Button variant="default" onClick={onClose}>
              Đóng
            </Button>
          ) : (
            <>
              {onRetry ? (
                <Button variant="default" onClick={onRetry}>
                  <RotateCcw aria-hidden />
                  Làm lại
                </Button>
              ) : null}
              {onReview ? (
                <Button variant="honey" onClick={onReview}>
                  <BookOpen aria-hidden />
                  {reviewLabel}
                </Button>
              ) : null}
              <Button variant="ghost" onClick={onClose}>
                Đóng
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
