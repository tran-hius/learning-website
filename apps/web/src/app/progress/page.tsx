"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  CalendarDays,
  Flame,
  Lock,
  Loader2,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PomodoroTimer } from "@/components/focus/PomodoroTimer";
import { Mascot } from "@/components/feedback/Mascot";
import {
  getProgressOverview,
  getWeakTopics,
  getTimeline,
  getStreakCalendar,
  getBadges,
} from "@/lib/api/progress";
import { friendlyApiMessage } from "@/lib/api/client";
import {
  DEMO_BADGES,
  DEMO_OVERVIEW,
  DEMO_WEAK_TOPICS,
  demoStreakCalendar,
  demoTimeline,
} from "@/lib/demo/demo-progress";
import { SUBJECTS } from "@/lib/subjects-data";
import { cn } from "@/lib/utils";
import type {
  BadgesResponse,
  ProgressOverview,
  StreakDay,
  TimelineItem,
  WeakTopicItem,
} from "@/lib/api/types";

/**
 * /progress — dashboard tiến độ (TASK-006, contract mục 6 G1–G5 + D14).
 * - G1 overview: XP/level, streak, progress bar theo môn (+sticker).
 * - G3 timeline: biểu đồ cột SVG thuần (KHÔNG thêm thư viện chart — quy tắc task).
 * - G4 streak-calendar: lưới contributions GitHub.
 * - G2 weak-topics (accuracy <70%) + link "Ôn lại" → /lessons/{id} (S4 theo id).
 * - G5 badges earned / upcoming (xám).
 * - PomodoroTimer (D14) đặt cạnh.
 * API lỗi → demo fallback trung thực (banner honey rõ ràng, D13).
 */

const DAYS = 30;

/** Màu chip theo tên môn — dùng lại bảng màu guide mục 2. */
function subjectTone(name: string): { chip: string; bar: string; emoji: string } {
  const match = SUBJECTS.find((s) => s.name === name);
  if (match) return { chip: match.chipClass, bar: "bg-teal-fresh-400", emoji: match.emoji };
  return { chip: "bg-cream-deep text-ink-700", bar: "bg-teal-fresh-400", emoji: "📚" };
}

function viDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

/** G3 — biểu đồ cột SVG thuần (XP theo ngày). */
function TimelineChart({ items }: { items: TimelineItem[] }) {
  const max = Math.max(10, ...items.map((i) => i.xpEarned));
  const W = 720;
  const H = 140;
  const pad = 24;
  const barW = (W - pad * 2) / Math.max(1, items.length);
  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-36 w-full"
        role="img"
        aria-label="Biểu đồ XP kiếm được theo ngày trong 30 ngày qua"
      >
        <line x1={pad} y1={H - 24} x2={W - pad} y2={H - 24} stroke="var(--color-ink-300)" strokeOpacity="0.5" />
        {items.map((it, i) => {
          const h = Math.round(((H - 24 - pad) * it.xpEarned) / max);
          const x = pad + i * barW + barW * 0.15;
          const w = Math.max(3, barW * 0.7);
          return (
            <g key={it.date}>
              <rect
                x={x}
                y={H - 24 - h}
                width={w}
                height={Math.max(h, it.xpEarned > 0 ? 3 : 0)}
                rx={3}
                fill={it.xpEarned > 0 ? "var(--color-teal-fresh-400)" : "var(--color-cream-deep)"}
              >
                <title>{`${viDate(it.date)}: +${it.xpEarned} XP · ${it.lessonsCompleted} bài · ${it.examsTaken} bài thi`}</title>
              </rect>
              {i % 6 === 0 ? (
                <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--color-ink-500)">
                  {viDate(it.date)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-xs text-ink-500">
        XP theo ngày (bài hoàn thành +10, Pomodoro +5) — 30 ngày gần nhất.
      </figcaption>
    </figure>
  );
}

/** G4 — lưới contributions GitHub (cột = tuần, 7 ô dọc). */
function StreakCalendar({ days }: { days: StreakDay[] }) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d.count])), [days]);
  const cells = useMemo(() => {
    // 26 tuần gần nhất, cột theo tuần (Thứ 2 bắt đầu).
    const out: Array<{ date: string; count: number }> = [];
    const today = new Date();
    const start = new Date(today.getTime() - (26 * 7 - 1) * 86_400_000);
    // Lùi về thứ 2 của tuần chứa `start`.
    const dow = (start.getUTCDay() + 6) % 7;
    start.setUTCDate(start.getUTCDate() - dow);
    for (let i = 0; i < 26 * 7; i++) {
      const d = new Date(start.getTime() + i * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, count: byDate.get(key) ?? 0 });
    }
    return out;
  }, [byDate]);

  const level = (c: number) =>
    c === 0
      ? "bg-cream-deep"
      : c <= 1
        ? "bg-honey-100"
        : c <= 3
          ? "bg-honey-300"
          : "bg-honey-500";

  return (
    <div className="flex flex-col gap-2">
      <div
        className="grid grid-flow-col grid-rows-7 gap-[3px]"
        role="img"
        aria-label="Lịch hoạt động học tập 26 tuần gần nhất, ô càng đậm càng nhiều hoạt động"
      >
        {cells.map((c) => (
          <span
            key={c.date}
            title={`${viDate(c.date)}: ${c.count} hoạt động`}
            className={cn("size-3.5 rounded-[4px] transition-colors", level(c.count))}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-ink-500">
        Ít
        <span className="size-3 rounded-[4px] bg-cream-deep" />
        <span className="size-3 rounded-[4px] bg-honey-100" />
        <span className="size-3 rounded-[4px] bg-honey-300" />
        <span className="size-3 rounded-[4px] bg-honey-500" />
        Nhiều
        <span className="ml-2">(mỗi ô = 1 ngày, đếm bài + thi + Pomodoro)</span>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const [loading, setLoading] = useState(true);
  const [needLogin, setNeedLogin] = useState(false);
  const [demo, setDemo] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [weak, setWeak] = useState<WeakTopicItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [calendar, setCalendar] = useState<StreakDay[]>([]);
  const [badges, setBadges] = useState<BadgesResponse | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [ov, wk, tl, cal, bd] = await Promise.all([
          getProgressOverview(),
          getWeakTopics(),
          getTimeline(DAYS),
          getStreakCalendar(new Date().getUTCFullYear()),
          getBadges(),
        ]);
        if (!alive) return;
        setOverview(ov);
        setWeak(wk.items);
        setTimeline(tl.items);
        setCalendar(cal.days);
        setBadges(bd);
      } catch (err) {
        if (!alive) return;
        const msg = friendlyApiMessage(err);
        setErrorText(msg);
        if (msg.includes("đăng nhập")) setNeedLogin(true);
        // Demo fallback trung thực — banner bắt buộc hiện kèm số liệu mẫu.
        setDemo(true);
        setOverview(DEMO_OVERVIEW);
        setWeak(DEMO_WEAK_TOPICS.items);
        setTimeline(demoTimeline(DAYS).items);
        setCalendar(demoStreakCalendar().days);
        setBadges(DEMO_BADGES);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <Container className="flex min-h-[320px] items-center justify-center gap-3 py-10 text-[15px] text-ink-700">
        <Loader2 className="size-5 animate-spin text-teal-fresh-500" aria-hidden />
        Đang tổng hợp tiến độ của bạn…
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-8 py-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Mascot mood="cheer" className="size-14 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              Tiến độ của bạn 🌱
            </h1>
            <p className="mt-1 text-[15px] text-ink-700">
              Nhìn lại một chút xem mình đã đi được bao xa rồi nha!
            </p>
          </div>
        </div>
      </header>

      {demo ? (
        <p className="flex items-start gap-2 rounded-[12px] border border-dashed border-honey-300 bg-honey-50 px-4 py-3 text-sm text-ink-700 animate-pop-in">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-honey-500" aria-hidden />
          <span>
            <strong className="font-semibold">Chế độ demo</strong> — số liệu dưới đây là dữ liệu mẫu cài sẵn
            ({errorText ? `${errorText}.` : "backend chưa chạy."}) Đăng nhập + backend chạy lại là bạn thấy
            tiến độ thật của mình nha!
            {needLogin ? (
              <>
                {" "}
                <Link href="/login" className="font-semibold text-teal-fresh-600 underline-offset-4 hover:underline">
                  Đăng nhập
                </Link>
              </>
            ) : null}
          </span>
        </p>
      ) : null}

      {/* G1 — overview: XP/level + streak + tiến độ theo môn */}
      <section aria-label="Tổng quan" className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-teal-fresh-500" aria-hidden /> Tiến độ theo môn
            </CardTitle>
            <CardDescription>Phần trăm bài học đã hoàn thành của từng môn.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {overview?.subjects.map((s) => {
              const tone = subjectTone(s.name);
              return (
                <div key={s.subjectId} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold", tone.chip)}>
                      <span aria-hidden>{tone.emoji}</span>
                      {s.name}
                    </span>
                    <span className="text-sm font-semibold text-ink-700">
                      {s.percentCompleted}% · chính xác {Math.round(s.avgAccuracy * 100)}%
                    </span>
                  </div>
                  <Progress value={s.percentCompleted} />
                  {s.chapters.length > 0 ? (
                    <p className="text-xs text-ink-500">
                      {s.chapters
                        .map((c) => `${c.title}: ${c.percentCompleted}%`)
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
              );
            })}
            {overview && overview.subjects.length === 0 ? (
              <p className="text-sm text-ink-500">Chưa có môn nào để tính tiến độ — vào Môn học bắt đầu nha!</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {/* Streak + XP sticker */}
          <Card className="bg-honey-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="size-4 text-honey-500" aria-hidden /> Chuỗi học liên tiếp
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end gap-6">
              <div>
                <p className="text-4xl font-bold text-ink-900 animate-soft-float">{overview?.currentStreak ?? 0}</p>
                <p className="text-sm text-ink-700">ngày hiện tại 🔥</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-ink-700">{overview?.longestStreak ?? 0}</p>
                <p className="text-sm text-ink-500">kỷ lục của bạn</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="size-4 text-coral-500" aria-hidden /> Kinh nghiệm
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-ink-900">{overview?.totalXp ?? 0} XP</p>
              <p className="mt-1 text-sm text-ink-700">
                Level {overview?.level ?? 0} — còn{" "}
                {100 - ((overview?.totalXp ?? 0) % 100)} XP nữa lên level {(overview?.level ?? 0) + 1}!
              </p>
              <Progress
                value={(overview?.totalXp ?? 0) % 100}
                className="mt-3"
                indicatorClassName="bg-coral-400"
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* G3 — timeline SVG + G4 — streak calendar */}
      <section aria-label="Hoạt động theo ngày" className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-teal-fresh-500" aria-hidden /> Nhịp học 30 ngày
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TimelineChart items={timeline} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-honey-500" aria-hidden /> Lịch hoạt động
            </CardTitle>
            <CardDescription>26 tuần gần nhất — kiểu lịch contributions.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <StreakCalendar days={calendar} />
          </CardContent>
        </Card>
      </section>

      {/* G2 — weak topics + Pomodoro */}
      <section aria-label="Mục cần ôn lại và Pomodoro" className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>🎯 Mục bạn nên ôn lại</CardTitle>
            <CardDescription>Các bài có độ chính xác dưới 70%.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {weak.length === 0 ? (
              <p className="text-sm text-ink-500">
                Chưa có mục nào dưới 70% — giữ nhịp này nhé, giỏi lắm! 💪
              </p>
            ) : (
              weak.map((w) => (
                <div
                  key={w.topic}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-cream-deep px-4 py-3"
                >
                  <div>
                    <p className="text-[15px] font-semibold text-ink-900">{w.topic}</p>
                    <p className="text-xs text-ink-500">
                      chính xác {Math.round(w.accuracy * 100)}% · {w.attempts} lượt làm
                      {w.recommendedLesson ? ` · gợi ý ôn: ${w.recommendedLesson.title}` : ""}
                    </p>
                  </div>
                  {w.recommendedLesson ? (
                    <Link
                      href={`/lessons/${encodeURIComponent(w.recommendedLesson.id)}`}
                      className="inline-flex min-h-[44px] items-center rounded-[12px] bg-teal-fresh-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-fresh-600"
                    >
                      Ôn lại bài này
                    </Link>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <PomodoroTimer isDemo={demo} />
      </section>

      {/* G5 — badges */}
      <section aria-label="Huy hiệu">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="size-4 text-honey-500" aria-hidden /> Bộ sưu tập huy hiệu
            </CardTitle>
            <CardDescription>Huy hiệu xám là mục tiêu tiếp theo của bạn.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {badges?.earned.map((b) => (
              <div
                key={b.id}
                className="flex min-w-[180px] flex-1 flex-col gap-0.5 rounded-[12px] border border-honey-300 bg-honey-50 px-4 py-3"
                title={`Đạt được: ${b.earnedAt ? new Date(b.earnedAt).toLocaleDateString("vi-VN") : ""}`}
              >
                <span className="text-2xl" aria-hidden>{b.icon}</span>
                <span className="text-sm font-semibold text-ink-900">{b.name}</span>
                <Badge variant="honey">Đã đạt được</Badge>
              </div>
            ))}
            {badges?.upcoming.map((b) => (
              <div
                key={b.id}
                className="flex min-w-[180px] flex-1 flex-col gap-0.5 rounded-[12px] border border-ink-300/40 bg-cream-deep px-4 py-3 opacity-70"
              >
                <span className="flex items-center gap-1 text-2xl" aria-hidden>
                  {b.icon}
                  <Lock className="size-3.5 text-ink-300" aria-hidden />
                </span>
                <span className="text-sm font-semibold text-ink-700">{b.name}</span>
                <span className="text-xs text-ink-500">{b.condition}</span>
              </div>
            ))}
            {badges && badges.earned.length === 0 && badges.upcoming.length === 0 ? (
              <p className="text-sm text-ink-500">Chưa có huy hiệu nào — học thêm để mở nha!</p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <div className="flex justify-center">
        <Link
          href="/subjects"
          className="inline-flex min-h-[44px] items-center rounded-[12px] border border-ink-300/60 bg-paper px-5 text-[15px] font-semibold text-ink-900 transition-colors duration-200 hover:bg-cream-deep"
        >
          Học tiếp để đầy màu lịch nha 🌈
        </Link>
      </div>
    </Container>
  );
}
