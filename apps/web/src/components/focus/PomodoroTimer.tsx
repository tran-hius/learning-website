"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Coffee, Play, Pause, RotateCcw, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recordPomodoro } from "@/lib/api/progress";
import { cn } from "@/lib/utils";

/**
 * PomodoroTimer — D14 (TASK-006): 30 phút học / 5 phút nghỉ.
 * - Đếm TUYỆT ĐỐI theo timestamp (deadline = epoch ms lưu localStorage) → refresh
 *   tab không làm trôi đồng hồ; quá hạn vẫn tự chuyển phase khi mở lại.
 * - Hoàn thành chuỗi FOCUS ≥25 phút → G6 POST /progress/pomodoro (+5 XP, tối đa
 *   8 chuỗi/ngày) → toast "Chuỗi tập trung hoàn thành! +5 XP 🍅".
 * - Demo fallback trung thực: API lỗi → vẫn chạy chu kỳ, toast ghi rõ KHÔNG cộng
 *   XP server; quota đếm theo thiết bị này (localStorage), không fake số server.
 */

const FOCUS_SEC = 30 * 60;
const BREAK_SEC = 5 * 60;
const DAILY_QUOTA = 8;
const STORE_KEY = "synapsebrain.pomodoro.v1";

type PhaseKind = "focus" | "break";

interface PersistedState {
  phase: PhaseKind;
  /** deadline epoch ms của phase hiện tại; null = đang dừng. */
  deadline: number | null;
  /** ms còn lại khi pause. */
  remainingOnPause: number;
  dayKey: string;
  sessionsToday: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadState(): PersistedState {
  const fallback: PersistedState = {
    phase: "focus",
    deadline: null,
    remainingOnPause: FOCUS_SEC * 1000,
    dayKey: todayKey(),
    sessionsToday: 0,
  };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed.dayKey !== todayKey()) {
      // Ngày mới → reset quota (đếm theo thiết bị — ghi rõ trung thực).
      return { ...fallback, phase: parsed.phase, remainingOnPause: FOCUS_SEC * 1000 };
    }
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function fmt(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

export interface PomodoroTimerProps {
  /** Trang demo (API chưa chạy) → không gọi G6, toast ghi rõ không cộng XP. */
  isDemo?: boolean;
  className?: string;
}

type Toast = { text: string; tone: "good" | "info" | "warn" } | null;

export function PomodoroTimer({ isDemo = false, className }: PomodoroTimerProps) {
  const [state, setState] = useState<PersistedState | null>(null); // hydrate client-side
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setState(loadState());
  }, []);

  const showToast = useCallback((t: NonNullable<Toast>) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // Tick 1s — mọi thứ tính từ Date.now() so deadline (tuyệt đối, không drift).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Lưu state mỗi lần đổi.
  useEffect(() => {
    if (state) {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(state));
      } catch {
        // private mode — bỏ qua, timer vẫn chạy trong phiên.
      }
    }
  }, [state]);

  const running = !!state?.deadline;

  /** Gọi G6 khi xong 1 chuỗi FOCUS. */
  const completeFocus = useCallback(
    async (sessionsToday: number) => {
      if (isDemo) {
        showToast({
          text: "Chuỗi tập trung hoàn thành! (demo — không cộng XP server) 🍅",
          tone: "info",
        });
        return;
      }
      try {
        const res = await recordPomodoro({ minutes: 30, completedAt: new Date().toISOString() });
        showToast({ text: `Chuỗi tập trung hoàn thành! +${res.xpEarned} XP 🍅`, tone: "good" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("Pomodoro XP limit") || msg.includes("RATE_LIMITED")) {
          showToast({ text: "Hôm nay đủ 8 chuỗi rồi — nghỉ ngơi đi nha! 🌙", tone: "warn" });
        } else {
          showToast({
            text: "Chuỗi hoàn thành nhưng server chưa ghi được XP — thử lại sau nha.",
            tone: "warn",
          });
        }
      }
      void sessionsToday;
    },
    [isDemo, showToast],
  );

  // Auto-chuyển phase khi quá deadline (chạy cả khi tab mở lại sau khi quá hạn).
  useEffect(() => {
    if (!state) return;
    if (state.deadline === null) {
      // Đang pause: không auto-chuyển.
      if (now === 0) setNow(Date.now());
      return;
    }
    if (now < state.deadline) return;

    // Phase kết thúc → chuyển phase kế + thông báo thân thiện (không alert).
    if (state.phase === "focus") {
      void completeFocus(state.sessionsToday);
      const nextSessions = Math.min(DAILY_QUOTA, state.sessionsToday + 1);
      showToast({ text: "Nghỉ 5 phút nhẹ nhàng nha ☕", tone: "info" });
      setState({
        ...state,
        phase: "break",
        deadline: Date.now() + BREAK_SEC * 1000,
        sessionsToday: nextSessions,
      });
    } else {
      showToast({ text: "Hết giờ nghỉ — học tiếp nha! 💪", tone: "info" });
      setState({ ...state, phase: "focus", deadline: Date.now() + FOCUS_SEC * 1000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  const remainingMs = state
    ? state.deadline !== null
      ? Math.max(0, state.deadline - now)
      : state.remainingOnPause
    : FOCUS_SEC * 1000;
  const phase = state?.phase ?? "focus";
  const totalMs = phase === "focus" ? FOCUS_SEC * 1000 : BREAK_SEC * 1000;
  const fraction = Math.min(1, remainingMs / totalMs);

  function toggle() {
    if (!state) return;
    if (running) {
      // Pause: đóng băng remaining.
      setState({ ...state, deadline: null, remainingOnPause: remainingMs });
    } else {
      setState({ ...state, deadline: Date.now() + remainingMs });
    }
  }

  function reset() {
    if (!state) return;
    setState({ ...state, phase: "focus", deadline: null, remainingOnPause: FOCUS_SEC * 1000 });
  }

  const quota = state?.sessionsToday ?? 0;
  const quotaFull = quota >= DAILY_QUOTA;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-[16px] border border-ink-300/30 bg-paper p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)]",
        className,
      )}
      aria-label="Bộ đếm Pomodoro 30 phút học, 5 phút nghỉ"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-ink-900">
          <Timer className="size-4 text-teal-fresh-500" aria-hidden />
          Pomodoro 30/5
        </h3>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            phase === "focus" ? "bg-teal-fresh-50 text-teal-fresh-600" : "bg-honey-100 text-honey-500",
          )}
        >
          {phase === "focus" ? "🍅 Tập trung" : "☕ Nghỉ ngắn"}
        </span>
      </div>

      {/* Đồng hồ vòng tròn — tính từ deadline tuyệt đối */}
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 72 72" className="size-20 -rotate-90" aria-hidden>
          <circle cx="36" cy="36" r="31" fill="none" stroke="var(--color-ink-300)" strokeOpacity="0.4" strokeWidth="6" />
          <circle
            cx="36"
            cy="36"
            r="31"
            fill="none"
            stroke={phase === "focus" ? "var(--color-teal-fresh-400)" : "var(--color-honey-400)"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${fraction * (2 * Math.PI * 31)} ${2 * Math.PI * 31}`}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="flex flex-col gap-1">
          <span
            className="font-mono text-3xl font-bold tabular-nums text-ink-900"
            role="timer"
            aria-live="polite"
            aria-label={`Còn lại ${fmt(remainingMs)}`}
          >
            {fmt(remainingMs)}
          </span>
          <span className="text-xs text-ink-500">
            {quotaFull
              ? `Đủ ${DAILY_QUOTA}/${DAILY_QUOTA} chuỗi hôm nay — XP ngừng cộng, chu kỳ vẫn chạy nha 🌙`
              : `Hôm nay: ${quota}/${DAILY_QUOTA} chuỗi (+5 XP/chuỗi)`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant={running ? "outline" : "default"} className="flex-1" onClick={toggle}>
          {running ? (
            <>
              <Pause aria-hidden /> Tạm dừng
            </>
          ) : (
            <>
              <Play aria-hidden /> {remainingMs < totalMs ? "Tiếp tục" : "Bắt đầu"}
            </>
          )}
        </Button>
        <Button variant="ghost" onClick={reset} aria-label="Đặt lại Pomodoro" title="Đặt lại">
          <RotateCcw aria-hidden />
        </Button>
      </div>

      {isDemo ? (
        <p className="text-xs text-ink-500">
          Chế độ demo — chuỗi hoàn thành không ghi XP vào server (backend chưa chạy).
        </p>
      ) : null}

      {/* Toast — không dùng alert (task D14). */}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "absolute -top-3 left-1/2 z-10 flex max-w-[92%] -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-[0_6px_24px_rgba(0,0,0,0.12)] animate-pop-in",
            toast.tone === "good" && "bg-mint-600 text-white",
            toast.tone === "info" && "bg-ink-900 text-white",
            toast.tone === "warn" && "bg-honey-400 text-ink-900",
          )}
        >
          {toast.tone === "good" ? <Coffee className="size-4" aria-hidden /> : null}
          {toast.text}
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Đóng thông báo"
            className="ml-1 rounded-full p-1 opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
