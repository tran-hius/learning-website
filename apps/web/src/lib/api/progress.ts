import { apiFetch } from "./client";
import type {
  Badge,
  BadgesResponse,
  PomodoroResult,
  ProgressOverview,
  StreakDay,
  TimelineItem,
  WeakTopicItem,
} from "./types";

/** G1 — Tổng quan tiến độ */
export function getProgressOverview(): Promise<ProgressOverview> {
  return apiFetch("/progress/overview");
}

/** G2 — Chủ đề yếu (accuracy < 0.7) */
export function getWeakTopics(): Promise<{ items: WeakTopicItem[] }> {
  return apiFetch("/progress/weak-topics");
}

/** G3 — Biểu đồ theo ngày, mặc định 30 ngày */
export function getTimeline(days = 30): Promise<{ items: TimelineItem[] }> {
  return apiFetch(`/progress/timeline?days=${days}`);
}

/** G4 — Lịch streak kiểu GitHub contributions */
export function getStreakCalendar(year?: number): Promise<{ days: StreakDay[] }> {
  const qs = year ? `?year=${year}` : "";
  return apiFetch(`/progress/streak-calendar${qs}`);
}

/** G5 — Huy hiệu đã nhận + sắp tới */
export function getBadges(): Promise<BadgesResponse> {
  return apiFetch("/progress/badges");
}

export type { Badge };

/** G6 — Ghi 1 chuỗi focus Pomodoro (D14: minutes ∈ [25..60], tối đa 8 chuỗi/ngày).
 * v1.1: dùng shared `PomodoroResult` (xpEarned + sessionsToday). */
export function recordPomodoro(input: {
  minutes: number;
  completedAt?: string;
}): Promise<PomodoroResult> {
  return apiFetch("/progress/pomodoro", { method: "POST", body: input });
}
