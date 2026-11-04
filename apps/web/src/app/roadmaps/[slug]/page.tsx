"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  Loader2,
  Lock,
  PlayCircle,
  TriangleAlert,
} from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  enrollRoadmap,
  getMyEnrollments,
  getMyRoadmapProgress,
  getRoadmapBySlug,
} from "@/lib/api/roadmaps";
import { friendlyApiMessage } from "@/lib/api/client";
import type { RoadmapDetail, RoadmapProgress } from "@/lib/api/types";
import { ROADMAPS } from "@/lib/subjects-data";
import { cn } from "@/lib/utils";

/**
 * /roadmaps/[slug] — chi tiết lộ trình (TASK-006, R2–R4):
 * - R2 tree milestones (🔒 khoá / 🔵 mở / ✅ xong theo R4).
 * - R3 "Bắt đầu lộ trình" → POST enroll (idempotent) → lưu enrollmentId vào
 *   localStorage làm fallback cache.
 * - R4 tiến độ: tìm enrollment qua GET /roadmaps/me (TASK-007); API lỗi →
 *   fallback localStorage (trung thực — ghi rõ trong code).
 * - % hoàn thành + highlight milestone hiện tại.
 * API lỗi → demo fallback trung thực.
 */

/** Fallback cache khi GET /roadmaps/me lỗi — không phải nguồn chân lý. */
const enrollmentKey = (roadmapId: string) => `synapsebrain.enrollment.${roadmapId}`;

const STATUS_META = {
  DONE: { icon: CheckCircle2, label: "Hoàn thành", chip: "bg-mint-100 text-mint-600" },
  AVAILABLE: { icon: CircleDot, label: "Đang mở", chip: "bg-teal-fresh-100 text-teal-fresh-600" },
  LOCKED: { icon: Lock, label: "Chưa mở", chip: "bg-cream-deep text-ink-500" },
  SKIPPED: { icon: CheckCircle2, label: "Đã qua", chip: "bg-cream-deep text-ink-500" },
} as const;

type Status = keyof typeof STATUS_META;

export default function RoadmapDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapDetail | null>(null);
  const [progress, setProgress] = useState<RoadmapProgress | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadProgress = useCallback(async (roadmapId: string) => {
    // TASK-007: nguồn chính là GET /roadmaps/me (backend liệt kê enrollment).
    try {
      const list = await getMyEnrollments();
      const match = list.find((e) => e.roadmapId === roadmapId);
      if (match) {
        const res = await getMyRoadmapProgress(match.id);
        setProgress(res);
        return;
      }
      // Đã đăng nhập nhưng chưa enroll lộ trình này → không có tiến độ.
      setProgress(null);
      return;
    } catch {
      // API lỗi (m mạng/chưa đăng nhập...) → fallback localStorage trung thực.
    }
    try {
      const stored = localStorage.getItem(enrollmentKey(roadmapId));
      if (!stored) return;
      const res = await getMyRoadmapProgress(stored);
      setProgress(res);
    } catch {
      // Enrollment hết hạn/không xem được → bỏ qua, vẫn xem tree R2.
      setProgress(null);
    }
  }, []);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    (async () => {
      try {
        const res = await getRoadmapBySlug(slug);
        if (!alive) return;
        setRoadmap(res);
        void loadProgress(res.id);
      } catch (err) {
        if (!alive) return;
        setErrorText(friendlyApiMessage(err));
        // Demo fallback trung thực (dùng bộ lộ trình tĩnh của web).
        const meta = ROADMAPS.find((r) => r.slug === slug);
        if (meta) {
          setDemo(true);
          setRoadmap({
            id: `demo-roadmap-${slug}`,
            slug,
            title: meta.title,
            milestones: ["Nền tảng", "Thực hành", "Dự án nhỏ", "Kiểm thử & tối ưu", "Dự án hoàn chỉnh"].map(
              (title, i) => ({
                id: `demo-ms-${i}`,
                title,
                order: i + 1,
                dependsOn: i === 0 ? [] : [`demo-ms-${i - 1}`],
                lessons: [],
              }),
            ),
          });
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug, loadProgress]);

  async function handleEnroll() {
    if (!roadmap) return;
    setEnrolling(true);
    setActionError(null);
    try {
      const { enrollment } = await enrollRoadmap(roadmap.id);
      try {
        localStorage.setItem(enrollmentKey(roadmap.id), enrollment.id);
      } catch {
        // private mode — tiến độ chỉ xem được trong phiên này.
      }
      const res = await getMyRoadmapProgress(enrollment.id);
      setProgress(res);
    } catch (err) {
      const msg = friendlyApiMessage(err);
      setActionError(msg);
      if (msg.includes("đăng nhập")) setNeedLogin(true);
    } finally {
      setEnrolling(false);
    }
  }

  if (loading) {
    return (
      <Container className="flex min-h-[320px] items-center justify-center gap-3 py-10 text-[15px] text-ink-700">
        <Loader2 className="size-5 animate-spin text-teal-fresh-500" aria-hidden />
        Đang mở lộ trình…
      </Container>
    );
  }

  if (!roadmap) {
    return (
      <Container className="flex max-w-3xl flex-col gap-4 py-8 sm:py-10">
        <h1 className="text-2xl font-bold text-ink-900">Không tìm thấy lộ trình này 🐾</h1>
        <Button variant="outline" className="w-fit" onClick={() => history.back()}>
          <ArrowLeft aria-hidden /> Quay lại
        </Button>
      </Container>
    );
  }

  const statusById = new Map((progress?.milestones ?? []).map((m) => [m.id, m.status as Status]));
  const currentStep = progress?.currentStep ?? null;
  const titleOf = (id: string) => roadmap.milestones.find((m) => m.id === id)?.title ?? "";

  return (
    <Container className="flex max-w-3xl flex-col gap-6 py-8 sm:py-10">
      <header className="flex flex-col gap-2">
        <Link
          href="/roadmaps"
          className="inline-flex min-h-[44px] w-fit items-center gap-2 text-sm font-semibold text-teal-fresh-600 underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden /> Tất cả lộ trình
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-3xl" aria-hidden>
            {ROADMAPS.find((r) => r.slug === roadmap.slug)?.emoji ?? "🛤️"}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{roadmap.title}</h1>
        </div>
      </header>

      {demo ? (
        <p className="flex items-start gap-2 rounded-[12px] border border-dashed border-honey-300 bg-honey-50 px-4 py-3 text-sm text-ink-700 animate-pop-in">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-honey-500" aria-hidden />
          <span>
            <strong className="font-semibold">Chế độ demo</strong> — cây mốc minh họa cài sẵn
            ({errorText ? `${errorText}.` : "backend chưa chạy."}).
          </span>
        </p>
      ) : null}

      {/* R4 — tiến độ lộ trình (chỉ hiện khi đã enroll) */}
      {progress ? (
        <Card className="border-teal-fresh-300">
          <CardHeader>
            <CardTitle>Tiến độ của bạn</CardTitle>
            <CardDescription>
              {currentStep ? `Đang tới mốc: ${titleOf(currentStep)}` : "Gần xong lộ trình rồi — cố lên!"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm font-semibold text-ink-700">
              <span>{progress.percentCompleted}% hoàn thành</span>
              <span>
                {progress.milestones.filter((m) => m.status === "DONE").length}/{progress.milestones.length} mốc
              </span>
            </div>
            <Progress value={progress.percentCompleted} />
          </CardContent>
        </Card>
      ) : null}

      {/* R2 — cây milestone + R3 enroll */}
      {!progress ? (
        <Card>
          <CardHeader>
            <CardTitle>Bắt đầu lộ trình này?</CardTitle>
            <CardDescription>
              Đăng ký để theo dõi tiến độ từng mốc — mốc mở dần khi bạn xong mốc trước (mỗi mốc gồm bài học
              và có thể có bài thi).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={() => void handleEnroll()} disabled={enrolling}>
              {enrolling ? <Loader2 className="animate-spin" aria-hidden /> : <PlayCircle aria-hidden />}
              Bắt đầu lộ trình
            </Button>
            {actionError ? (
              <p role="alert" className="text-sm text-coral-600">
                {actionError}
                {needLogin ? (
                  <>
                    {" "}
                    <Link href="/login" className="font-semibold text-teal-fresh-600 underline-offset-4 hover:underline">
                      Đăng nhập
                    </Link>
                  </>
                ) : null}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <section aria-label="Các mốc của lộ trình" className="flex flex-col gap-3">
        {roadmap.milestones.map((m) => {
          const status: Status = statusById.get(m.id) ?? "LOCKED";
          const meta = STATUS_META[status];
          const Icon = meta.icon;
          const isCurrent = currentStep === m.id;
          return (
            <Card
              key={m.id}
              className={cn(
                "transition-transform duration-200",
                isCurrent && "border-teal-fresh-400 shadow-[0_6px_28px_rgba(38,166,154,0.18)]",
              )}
            >
              <CardHeader className="flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "size-6 shrink-0",
                      status === "DONE" && "text-mint-600",
                      status === "AVAILABLE" && "text-teal-fresh-500",
                      (status === "LOCKED" || status === "SKIPPED") && "text-ink-300",
                    )}
                    aria-hidden
                  />
                  <div>
                    <p className="text-[15px] font-semibold text-ink-900">
                      Mốc {m.order}: {m.title}
                    </p>
                    <p className="text-xs text-ink-500">
                      {m.lessons.length > 0 ? `${m.lessons.length} bài học` : "Không có bài học"}
                      {m.examBankId ? " · có bài thi" : ""}
                    </p>
                  </div>
                </div>
                <Badge variant={status === "DONE" ? "mint" : status === "AVAILABLE" ? "default" : "outline"}>
                  {meta.label}
                </Badge>
              </CardHeader>
              {m.lessons.length > 0 || m.examBankId ? (
                <CardContent className="flex flex-col gap-2 border-t border-ink-300/20 pt-4">
                  <ul className="flex flex-col gap-1.5">
                    {m.lessons.map((l) => (
                      <li key={l.lessonId} className="flex items-center gap-2 text-sm text-ink-700">
                        <span aria-hidden>📘</span> {l.title}
                      </li>
                    ))}
                  </ul>
                  {m.examBankId ? (
                    <Link
                      href={`/exams/${encodeURIComponent(m.examBankId)}`}
                      className="inline-flex min-h-[44px] w-fit items-center gap-2 rounded-[12px] bg-coral-400 px-4 text-sm font-semibold text-white transition-colors hover:bg-coral-500"
                    >
                      Làm bài thi của mốc này
                    </Link>
                  ) : null}
                </CardContent>
              ) : null}
            </Card>
          );
        })}
      </section>
    </Container>
  );
}
