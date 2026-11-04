"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Coffee, Play, Pause, RotateCcw, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMe } from "@/lib/api/auth";
import { recordPomodoro } from "@/lib/api/progress";
import { cn } from "@/lib/utils";

/**
 * PomodoroTimer — D14 (TASK-006) + F3/F6 (TASK-007):
 * - Đếm TUYỆT ĐỐI theo timestamp (deadline = epoch ms lưu localStorage) → refresh
 *   tab không làm trôi đồng hồ; quá hạn vẫn tự chuyển phase khi mở lại.
 * - F3 TRUNG THỰC: counter chỉ tăng khi server trả `xpEarned` (dùng luôn
 *   `sessionsToday` từ response — không tự bịa). 429/lỗi → giữ nguyên counter,
 *   chỉ thông báo. Demo/ước lượng trên thiết bị hiển thị dấu "≈".
 * - F6: localStorage key theo user (`synapsebrain.pomodoro.{userId|guest}`),
 *   toast timer được clear khi unmount.
 */

const FOCUS_SEC = 30 * 60;
const BREAK_SEC = 5 * 60;
const DAILY_QUOTA = 8;

/** F6 — key theo user: có user → id, không (chưa load/lỗi) → guest. */
function storeKey(userId: string): string {
  return `synapsebrain.pomodoro.${userId}`;
}

type PhaseKind = "focus" | "break";

interface PersistedState {
  phase: PhaseKind;
  /** deadline epoch ms của phase hiện tại; null = đang dừng. */
  deadline: number | null;
  /** ms còn lại khi pause. */
  remainingOnPause: number;
  dayKey: string;
  sessionsToday: number;
  /** true khi counter chỉ là ước lượng trên thiết bị (demo hoặc server chưa ghi). */
  approx: boolean;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadState(key: string): PersistedState {
  const fallback: PersistedState = {
    phase: "focus",
    deadline: null,
    remainingOnPause: FOCUS_SEC * 1000,
    dayKey: todayKey(),
    sessionsToday: 0,
    approx: false,
  };
  try {
    const raw = localStorage.getItem(key);
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
  /** F6 — uid cho storage key: chưa load/lỗi → "guest". */
  const [userId, setUserId] = useState<string | null>(null);
  const stateRef = useRef<PersistedState | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // F6 — resolve user để tách key theo từng người (lỗi/401 → guest).
  useEffect(() => {
    let alive = true;
    getMe()
      .then((me) => {
        if (alive) setUserId(me.user.id);
      })
      .catch(() => {
        if (alive) setUserId("guest");
      });
    return () => {
      alive = false;
    };
  }, []);

  // F6 — load state theo key của user (sau khi biết uid); lưu mỗi lần đổi.
  const key = storeKey(userId ?? "guest");
  useEffect(() => {
    setState(loadState(key));
  }, [key]);

  useEffect(() => {
    if (state) {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // private mode — bỏ qua, timer vẫn chạy trong phiên.
      }
    }
  }, [state, key]);

  // F6 — clear toast timer khi unmount (không setState sau unmount).
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
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

  const running = !!state?.deadline;

  /** Gọi G6 khi xong 1 chuỗi FOCUS. Trả về số chuỗi mới (F3: chỉ tăng khi server xác nhận). */
  const completeFocus = useCallback(
    async (sessionsToday: number): Promise<number> => {
      if (isDemo) {
        showToast({
          text: "Chuỗi tập trung hoàn thành! (demo — không cộng XP server) 🍅",
          tone: "info",
        });
        // Demo: đếm ước lượng trên thiết bị này — hiển thị kèm "≈".
        return sessionsToday + 1;
      }
      try {
        const res = await recordPomodoro({ minutes: 30, completedAt: new Date().toISOString() });
        if (typeof res?.xpEarned !== "number") {
          // Server trả thiếu xpEarned → KHÔNG tự tăng counter (F3).
          showToast({
            text: "Chuỗi hoàn thành nhưng server chưa xác nhận XP — chưa đếm chuỗi này nha.",
            tone: "warn",
          });
          return sessionsToday;
        }
        showToast({ text: `Chuỗi tập trung hoàn thành! +${res.xpEarned} XP 🍅`, tone: "good" });
        // Dùng số server trả về (nguồn chân lý), fallback +1 khi thiếu trường.
        return typeof res.sessionsToday === "number" ? res.sessionsToday : sessionsToday + 1;
      } catch (err) {
        // F3: 429/lỗi → giữ nguyên counter, chỉ thông báo.
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("Pomodoro XP limit") || msg.includes("RATE_LIMITED")) {
          showToast({ text: "Hôm nay đủ 8 chuỗi rồi — nghỉ ngơi đi nha! 🌙", tone: "warn" });
        } else {
          showToast({
            text: "Chuỗi hoàn thành nhưng server chưa ghi được XP — chuỗi này chưa được đếm nha.",
            tone: "warn",
          });
        }
        return sessionsToday;
      }
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
      const prev = state;
      // Chuyển phase NGAY (đồng hồ không đứng) — counter cập nhật khi có kết quả G6.
      setState({
        ...state,
        phase: "break",
        deadline: Date.now() + BREAK_SEC * 1000,
        approx: isDemo, // tăng ở bước dưới chỉ khi được xác nhận/demo
      });
      showToast({ text: "Nghỉ 5 phút nhẹ nhàng nha ☕", tone: "info" });
      void completeFocus(prev.sessionsToday).then((nextSessions) => {
        // Chỉ ghi khi chưa có tick khác ghi đè (so sánh với snapshot mới nhất).
        const cur = stateRef.current;
        if (cur && cur.phase === "break") {
          setState({
            ...cur,
            sessionsToday: Math.min(DAILY_QUOTA, nextSessions),
            approx: isDemo || nextSessions === prev.sessionsToday,
          });
        }
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
            aria-label="Bộ đếm Pomodoro"
          >
            {fmt(remainingMs)}
          </span>
          <span className="text-xs text-ink-500">
            {quotaFull
              ? `Đủ ${DAILY_QUOTA}/${DAILY_QUOTA} chuỗi hôm nay — XP ngừng cộng, chu kỳ vẫn chạy nha 🌙`
              : `${state?.approx ? "≈" : ""}Hôm nay: ${quota}/${DAILY_QUOTA} chuỗi (+5 XP/chuỗi)`}
          </span>
          {state?.approx ? (
            <span className="text-xs text-ink-500">
              Số chuỗi ước lượng trên thiết bị này (server chưa xác nhận).
            </span>
          ) : null}
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
