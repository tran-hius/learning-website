"use client";

import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Đồng hồ đếm ngược TUYỆT ĐỐI theo `expiresAt` (deadline từ API — mục 5:
 * DB expiresAt là nguồn chân lý). KHÔNG đếm từ client start → refresh tab
 * không làm sai giờ. Mỗi tick tính lại từ Date.now() so với deadline.
 * Màu: còn > 20% thời gian → teal; ≤ 20% → honey (vàng); hết giờ → coral.
 */
export interface CountdownTimerProps {
  expiresAt: string;
  durationSec: number;
  /** Gọi 1 lần khi hết giờ. */
  onExpire?: () => void;
}

function remainingSec(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(diff)) return 0;
  return Math.max(0, Math.floor(diff / 1000));
}

function fmt(sec: number): string {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
    : `${m}:${String(ss).padStart(2, "0")}`;
}

export function CountdownTimer({ expiresAt, durationSec, onExpire }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => remainingSec(expiresAt));
  const expiredRef = useRef(false);
  // A11y (TASK-007): aria-live chỉ announce khi đổi MỐC PHÚT hoặc vào ngưỡng
  // urgent — không đọc to mỗi giây (screen reader spam).
  const [announce, setAnnounce] = useState(() => fmt(remainingSec(expiresAt)));
  const lastMinuteRef = useRef<number | null>(null);
  const urgentRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    lastMinuteRef.current = null;
    urgentRef.current = false;
    const tick = () => {
      const r = remainingSec(expiresAt);
      setRemaining(r);
      // Chỉ cập nhật nhãn announce tại mốc phút hoặc khi vừa vào ngưỡng urgent.
      const minute = Math.ceil(r / 60);
      const urgentNow = r > 0 && r / Math.max(1, durationSec) <= 0.2;
      if (minute !== lastMinuteRef.current || (urgentNow && !urgentRef.current)) {
        lastMinuteRef.current = minute;
        urgentRef.current = urgentNow;
        setAnnounce(r <= 0 ? "Hết giờ" : `Thời gian còn lại ${fmt(r)}`);
      }
      if (r <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire, durationSec]);

  const total = Math.max(1, durationSec);
  const fraction = Math.min(1, remaining / total);
  const urgent = remaining > 0 && fraction <= 0.2;
  const out = remaining <= 0;
  const ringColor = out ? "var(--color-coral-500)" : urgent ? "var(--color-honey-400)" : "var(--color-teal-fresh-400)";
  const ringLen = 2 * Math.PI * 15.5;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors duration-200",
        out && "bg-coral-50 text-coral-600",
        urgent && !out && "bg-honey-50 text-ink-900",
        !out && !urgent && "bg-cream-deep text-ink-700",
      )}
      role="timer"
      aria-live="polite"
      aria-label={announce}
    >
      <svg viewBox="0 0 36 36" className="size-7 -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-ink-300)" strokeOpacity="0.4" strokeWidth="4" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke={ringColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${fraction * ringLen} ${ringLen}`}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <Timer className="size-4" aria-hidden />
      <span className="font-mono tabular-nums" aria-hidden>{out ? "Hết giờ" : fmt(remaining)}</span>
    </div>
  );
}
