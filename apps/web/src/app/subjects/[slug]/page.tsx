import Link from "next/link";
import { FlaskConical, Lock, PlayCircle } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/badge";
import { getSubjectServer, getChapterLessonsServer } from "@/lib/api/content.server";
import { findDemoSubject } from "@/lib/demo/demo-subjects";
import { SUBJECTS } from "@/lib/subjects-data";
import { cn } from "@/lib/utils";

/**
 * /subjects/[slug] — chi tiết môn: chương dạng **hành trình dọc** (roadmap,
 * guide mục 7), mỗi bài có sticker trạng thái ✅ Đã hoàn thành / 🔵 Đang học /
 * 🔒 Chưa mở khóa.
 * S2 🔓 công khai; trạng thái completed lấy từ S3 (cần đăng nhập — chưa đăng
 * nhập hoặc API chưa chạy → demo mode với sticker demo).
 */

interface LessonItem {
  id: string;
  slug: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
  /** Demo mode: trạng thái cài sẵn (thật thì derive từ completed). */
  demoStatus?: "DONE" | "DOING" | "LOCKED";
}

const STICKER = {
  done: { emoji: "✅", label: "Đã hoàn thành", cls: "bg-mint-100 text-mint-600" },
  doing: { emoji: "🔵", label: "Đang học", cls: "bg-sky-soft-100 text-sky-soft-600" },
  locked: { emoji: "🔒", label: "Chưa mở khóa", cls: "bg-cream-deep text-ink-500" },
} as const;

function Sticker({ status, isDemo }: { status: "DONE" | "DOING" | "LOCKED"; isDemo: boolean }) {
  const s = STICKER[status === "DONE" ? "done" : status === "DOING" ? "doing" : "locked"];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        s.cls,
      )}
      title={isDemo ? `${s.label} (trạng thái demo)` : s.label}
    >
      <span aria-hidden>{s.emoji}</span>
      {s.label}
      {isDemo ? "*" : ""}
    </span>
  );
}

export default async function SubjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const remote = await getSubjectServer(slug);
  const meta = SUBJECTS.find((s) => s.slug === slug);
  const isDemo = !remote;

  // Demo mode: dữ liệu mẫu (môn Toán) — nhãn demo rõ ràng.
  const demo = isDemo ? findDemoSubject(slug) : null;

  // Thật: với mỗi chương gọi S3 để lấy bài + trạng thái completed
  // (chưa đăng nhập → S3 lỗi → coi như không có trạng thái, sticker "Chưa mở khóa" demo).
  const chapters = remote
    ? await Promise.all(
        remote.chapters.map(async (ch) => {
          const data = await getChapterLessonsServer(slug, ch.id);
          const lessons: LessonItem[] | null = data ? data.items : null;
          return { chapter: ch, lessons };
        }),
      )
    : (demo?.chapters.map((ch) => ({
        chapter: ch,
        lessons: ch.lessons.map((l) => ({
          ...l,
          completed: l.status === "DONE",
          demoStatus: l.status,
        })),
      })) ?? []);

  if (!remote && !demo) {
    return (
      <Container className="flex max-w-3xl flex-col gap-4 py-8 sm:py-10">
        <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">Môn này chưa có nội dung 🐾</h1>
        <p className="text-[15px] text-ink-700">
          Môn <code className="rounded bg-cream-deep px-1.5 py-0.5 font-mono text-sm">{slug}</code> chưa
          mở. Bạn xem các môn khác ở{" "}
          <Link href="/subjects" className="text-teal-fresh-600 underline-offset-4 hover:underline">
            trang Môn học
          </Link>{" "}
          nha!
        </p>
      </Container>
    );
  }

  const name = remote?.subject.name ?? demo?.subject.name ?? meta?.name ?? slug;
  const icon = remote?.subject.icon ?? demo?.subject.icon ?? meta?.emoji ?? "📘";
  const chipClass = meta?.chipClass ?? "bg-cream-deep text-ink-700";
  const description = remote?.subject.description ?? meta?.description ?? "";
  const demoLesson = isDemo && demo ? demo.chapters[0]?.lessons[0] : undefined;
  const demoLessonSlug = demoLesson?.slug;

  return (
    <Container className="flex flex-col gap-8 py-8 sm:py-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className={cn("flex size-12 items-center justify-center rounded-[12px] text-2xl", chipClass)} aria-hidden>
            {icon}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{name}</h1>
            <p className="text-[15px] text-ink-700">{description}</p>
          </div>
        </div>
        {isDemo ? (
          <p className="flex items-start gap-2 rounded-[12px] border border-dashed border-honey-300 bg-honey-50 px-4 py-3 text-sm text-ink-700 animate-pop-in">
            <FlaskConical className="mt-0.5 size-4 shrink-0 text-honey-500" aria-hidden />
            <span>
              <strong className="font-semibold">Chế độ demo</strong> — lộ trình mẫu cài sẵn trong web.
              Trạng thái có dấu * là dữ liệu demo; đăng nhập + backend chạy sẽ hiện tiến độ thật của bạn.
            </span>
          </p>
        ) : null}
      </header>

      {/* Hành trình dọc: đường nối trái, mỗi chương một mốc */}
      <div className="flex flex-col gap-0">
        {chapters.map(({ chapter, lessons }, ci) => {
          const doneCount = lessons?.filter((l) => l.completed).length ?? 0;
          const percent =
            lessons && lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0;
          return (
            <div key={chapter.id} className="relative flex gap-4 pb-8 last:pb-0">
              {/* đường nối dọc */}
              {ci < chapters.length - 1 ? (
                <div
                  aria-hidden
                  className="absolute left-[19px] top-10 h-[calc(100%-2.5rem)] w-0.5 rounded bg-ink-300/40"
                />
              ) : null}
              {/* mốc chương */}
              <div
                className={cn(
                  "z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 bg-paper text-sm font-bold",
                  percent === 100
                    ? "border-mint-400 text-mint-600"
                    : percent > 0
                      ? "border-teal-fresh-400 text-teal-fresh-600"
                      : "border-ink-300/60 text-ink-500",
                )}
                title={lessons ? `${percent}% bài đã hoàn thành` : undefined}
              >
                {ci + 1}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-ink-900">{chapter.title}</h2>
                  {lessons && lessons.length > 0 ? (
                    <Badge variant={percent === 100 ? "mint" : "outline"}>
                      {doneCount}/{lessons.length} bài
                    </Badge>
                  ) : (
                    <Badge variant="outline">Chưa có bài</Badge>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {(lessons ?? []).map((lesson, li) => {
                    const derived: "DONE" | "DOING" | "LOCKED" = lesson.completed
                      ? "DONE"
                      : li === doneCount
                        ? "DOING"
                        : "LOCKED";
                    const status = isDemo && lesson.demoStatus ? lesson.demoStatus : derived;
                    const unlocked = status !== "LOCKED";
                    const href = `/lessons/${lesson.slug}`;
                    const inner = (
                      <>
                        <Sticker status={status} isDemo={isDemo} />
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-[15px] font-medium leading-snug",
                              unlocked ? "text-ink-900" : "text-ink-500",
                            )}
                          >
                            {lesson.title}
                          </p>
                          <p className="text-xs text-ink-500">~{lesson.estimatedMinutes} phút</p>
                        </div>
                        {unlocked ? (
                          <PlayCircle className="ml-auto size-5 shrink-0 text-teal-fresh-500 transition-transform duration-200 ease-out group-hover:scale-110" aria-hidden />
                        ) : (
                          <Lock className="ml-auto size-5 shrink-0 text-ink-300" aria-hidden />
                        )}
                      </>
                    );
                    const rowCls =
                      "group flex items-center gap-3 rounded-[12px] border border-ink-300/30 bg-paper px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out";
                    return unlocked ? (
                      <Link key={lesson.id} href={href} className={cn(rowCls, "hover:-translate-y-0.5 hover:border-teal-fresh-400 hover:shadow-[0_6px_20px_rgba(0,0,0,0.07)]")}>
                        {inner}
                      </Link>
                    ) : (
                      <div key={lesson.id} className={cn(rowCls, "opacity-80")} aria-disabled>
                        {inner}
                      </div>
                    );
                  })}
                  {lessons === null ? (
                    <p className="rounded-[12px] bg-cream-deep px-4 py-3 text-sm text-ink-700">
                      Đăng nhập để xem bài học và tiến độ của chương này nha 🐾
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isDemo && demoLessonSlug ? (
        <p className="text-sm text-ink-500">
          Thử ngay bài demo:{" "}
          <Link href={`/lessons/${demoLessonSlug}`} className="font-medium text-teal-fresh-600 underline-offset-4 hover:underline">
            {demoLesson?.title}
          </Link>
        </p>
      ) : null}
    </Container>
  );
}
