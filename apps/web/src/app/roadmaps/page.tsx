"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Compass, Loader2, Map, PlayCircle, TriangleAlert } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExamRunner } from "@/components/exam/ExamRunner";
import { getRoadmaps, startPlacementTest } from "@/lib/api/roadmaps";
import { friendlyApiMessage } from "@/lib/api/client";
import type { RoadmapListItem } from "@/lib/api/types";
import type { PlacementResultReal } from "@/lib/api/roadmaps";
import { ROADMAPS } from "@/lib/subjects-data";

/**
 * /roadmaps — danh sách lộ trình nghề nghiệp (TASK-006, R1) + CTA test đầu vào
 * (R5: POST /progress/placement-test → vào ngay phòng thi placement, tái dùng
 * ExamRunner kind PLACEMENT_TEST — luôn bật proctoring D15) → kết quả gợi lộ trình.
 * API lỗi → demo fallback trung thực (banner honey, không fake như thật).
 */
export default function RoadmapsPage() {
  const [loading, setLoading] = useState(true);
  const [needLogin, setNeedLogin] = useState(false);
  const [demo, setDemo] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [items, setItems] = useState<RoadmapListItem[]>([]);

  // R5 placement flow
  const [placementStarting, setPlacementStarting] = useState(false);
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [placement, setPlacement] = useState<PlacementResultReal | null>(null);
  const [placementDone, setPlacementDone] = useState<{ recommended: string | null; confidence: number } | null>(
    null,
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getRoadmaps();
        if (!alive) return;
        setItems(res.items);
      } catch (err) {
        if (!alive) return;
        const msg = friendlyApiMessage(err);
        setErrorText(msg);
        if (msg.includes("đăng nhập")) setNeedLogin(true);
        // Demo fallback trung thực — đúng tone nhưng ghi rõ là demo.
        setDemo(true);
        setItems(
          ROADMAPS.map((r, i) => ({
            id: `demo-roadmap-${i}`,
            slug: r.slug,
            title: r.title,
            description: r.description,
            icon: r.emoji ?? "🛤️",
            milestoneCount: 5, // demo — số mốc minh họa, lộ trình thật từ R1
          })),
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const startPlacement = useCallback(async () => {
    setPlacementStarting(true);
    setPlacementError(null);
    try {
      const res = await startPlacementTest();
      setPlacement(res);
    } catch (err) {
      const msg = friendlyApiMessage(err);
      setPlacementError(msg);
      if (msg.includes("đăng nhập")) setNeedLogin(true);
    } finally {
      setPlacementStarting(false);
    }
  }, []);

  if (loading) {
    return (
      <Container className="flex min-h-[320px] items-center justify-center gap-3 py-10 text-[15px] text-ink-700">
        <Loader2 className="size-5 animate-spin text-teal-fresh-500" aria-hidden />
        Đang lấy danh sách lộ trình…
      </Container>
    );
  }

  // ── Phòng thi placement đang mở (R5) ──────────────────────────────────
  if (placement) {
    return (
      <Container className="flex max-w-3xl flex-col gap-6 py-8 sm:py-10">
        <header className="flex flex-col gap-2">
          <Badge variant="coral">Test đầu vào</Badge>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Bài test đầu vào 🧭
          </h1>
          <p className="text-[15px] text-ink-700">
            Làm hết để mình biết trình độ hiện tại của bạn — xong sẽ gợi lộ trình vừa sức nhất nha!
          </p>
        </header>
        <ExamRunner
          kind="PLACEMENT_TEST"
          onSubmitted={(result) => {
            setPlacementDone({
              recommended: placement.recommendedRoadmap?.title ?? null,
              confidence: placement.confidence,
            });
            void result;
          }}
        />
        {placementDone ? (
          <Card className="border-teal-fresh-300 bg-teal-fresh-50">
            <CardHeader>
              <CardTitle>Kết quả gợi ý lộ trình</CardTitle>
              <CardDescription>
                {placementDone.recommended
                  ? `Dựa trên bài test, lộ trình ${placementDone.recommended} có vẻ vừa với bạn nhất (độ tin cậy ${Math.round(placementDone.confidence * 100)}%).`
                  : "Chưa có lộ trình nào để gợi ý — thử lại sau nhé!"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/roadmaps"
                className="inline-flex min-h-[44px] items-center rounded-[12px] bg-teal-fresh-500 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-teal-fresh-600"
              >
                Xem lại các lộ trình
              </Link>
            </CardContent>
          </Card>
        ) : null}
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-8 py-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            <Map className="size-6 text-coral-500" aria-hidden /> Lộ trình nghề nghiệp
          </h1>
          <p className="mt-1 text-[15px] text-ink-700">
            Chọn một con đường, đi từng mốc một — mốc nào mở thì học, xong thì mở mốc kế tiếp nha!
          </p>
        </div>
      </header>

      {demo ? (
        <p className="flex items-start gap-2 rounded-[12px] border border-dashed border-honey-300 bg-honey-50 px-4 py-3 text-sm text-ink-700 animate-pop-in">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-honey-500" aria-hidden />
          <span>
            <strong className="font-semibold">Chế độ demo</strong> — danh sách lộ trình mẫu cài sẵn
            ({errorText ? `${errorText}.` : "backend chưa chạy."}).
            {needLogin ? (
              <>
                {" "}
                <Link href="/login" className="font-semibold text-teal-fresh-600 underline-offset-4 hover:underline">
                  Đăng nhập
                </Link>{" "}
                để xem lộ trình thật nha!
              </>
            ) : null}
          </span>
        </p>
      ) : null}

      {/* R5 — placement CTA */}
      <Card className="border-honey-300 bg-honey-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="size-5 text-honey-500" aria-hidden /> Chưa biết bắt đầu từ đâu?
          </CardTitle>
          <CardDescription>
            Làm bài test đầu vào (~30 phút, có giám sát nhẹ) — mình sẽ gợi lộ trình vừa với trình độ hiện tại.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={() => void startPlacement()} disabled={placementStarting}>
            {placementStarting ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <PlayCircle aria-hidden />
            )}
            Làm bài test đầu vào
          </Button>
          {placementError ? (
            <p role="alert" className="text-sm text-coral-600">
              {placementError}
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

      {/* R1 — danh sách lộ trình */}
      <section aria-label="Danh sách lộ trình" className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((r) => (
          <Link key={r.id} href={`/roadmaps/${encodeURIComponent(r.slug)}`} className="group">
            <Card className="flex h-full flex-col transition-transform duration-200 ease-out group-hover:-translate-y-0.5">
              <CardHeader>
                <span className="text-3xl" aria-hidden>{r.icon}</span>
                <CardTitle>{r.title}</CardTitle>
                <CardDescription className="line-clamp-3">{r.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Badge variant="outline">{r.milestoneCount} mốc</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-ink-500">Chưa có lộ trình nào — quay lại sau nha!</p>
        ) : null}
      </section>
    </Container>
  );
}
