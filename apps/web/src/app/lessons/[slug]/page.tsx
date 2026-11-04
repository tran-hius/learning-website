import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/badge";
import { PracticeSection } from "@/components/lesson/PracticeSection";
import { getLessonServer } from "@/lib/api/content.server";
import { findDemoLesson } from "@/lib/demo/demo-lesson";
import { MarkdownContent, extractHeadings } from "@/lib/markdown";
import type { QuestionPublic } from "@/lib/api/types";
import type { DemoQuestion } from "@/lib/demo/demo-lesson";

/**
 * /lessons/[slug] — trang bài học thực thụ.
 * - Ưu tiên S4 GET /lessons (cần đăng nhập); API/DB chưa chạy → fallback DEMO
 *   với banner "chế độ demo" rõ ràng (KHÔNG fake data như thật).
 * - Sidebar mục lục sticky (desktop), nội dung max-w-3xl (guide mục 7).
 */

interface LessonView {
  title: string;
  subjectName: string;
  subjectSlug: string;
  chapterTitle: string;
  estimatedMinutes: number;
  thinkingSection: string;
  content: string;
  lessonId: string;
  setId: string | null;
  questions: QuestionPublic[];
  demoQuestions: Record<string, DemoQuestion>;
}

/** Map demo → shape chung của trang. */
function demoToView(slug: string): LessonView | null {
  const demo = findDemoLesson(slug);
  if (!demo) return null;
  return {
    lessonId: demo.id,
    title: demo.title,
    subjectName: demo.subjectName,
    subjectSlug: demo.subjectSlug,
    chapterTitle: demo.chapterTitle,
    estimatedMinutes: demo.estimatedMinutes,
    thinkingSection: demo.thinkingSection,
    content: demo.content,
    setId: null,
    questions: demo.questions.map((q) => ({
      id: q.id,
      type: q.type,
      difficulty: q.difficulty,
      stem: q.stem,
      options: q.options,
    })),
    demoQuestions: Object.fromEntries(demo.questions.map((q) => [q.id, q])),
  };
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // LƯU Ý contract: S4 nhận lessonId — truyền slug thẳng, 404 → demo (câu hỏi
  // cho manager về endpoint tra slug→id đã ghi trong task file).
  const remote = await getLessonServer(slug);

  const view: LessonView | null = remote
    ? {
        lessonId: remote.lesson.id,
        title: remote.lesson.title,
        subjectName: remote.lesson.subject.name,
        subjectSlug: remote.lesson.subject.slug,
        chapterTitle: remote.lesson.chapter.title,
        estimatedMinutes: remote.lesson.estimatedMinutes,
        thinkingSection: remote.lesson.thinkingSection,
        content: remote.lesson.content,
        setId: remote.practiceSets[0]?.id ?? null,
        questions: (remote.practiceSets[0]?.questions ?? []) as QuestionPublic[],
        demoQuestions: {},
      }
    : demoToView(slug);

  if (!view) {
    return (
      <Container className="flex max-w-3xl flex-col gap-6 py-8 sm:py-10">
        <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">Chưa tìm thấy bài này 🐾</h1>
        <p className="text-[15px] text-ink-700">
          Bài <code className="rounded bg-cream-deep px-1.5 py-0.5 font-mono text-sm">{slug}</code> chưa có
          trong kho bài học. Bạn thử mở một môn ở trang{" "}
          <Link href="/subjects" className="text-teal-fresh-600 underline-offset-4 hover:underline">
            Môn học
          </Link>{" "}
          nha!
        </p>
      </Container>
    );
  }

  const isDemo = !remote;
  const toc = extractHeadings(view.content);

  return (
    <Container className="py-8 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px]">
        <article className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <header className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="honey">{view.subjectName}</Badge>
              <Badge variant="outline">{view.chapterTitle}</Badge>
              <Badge variant="sky">~{view.estimatedMinutes} phút</Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{view.title}</h1>
          </header>

          {isDemo ? (
            <p className="flex items-start gap-2 rounded-[12px] border border-dashed border-honey-300 bg-honey-50 px-4 py-3 text-sm text-ink-700 animate-pop-in">
              <FlaskConical className="mt-0.5 size-4 shrink-0 text-honey-500" aria-hidden />
              <span>
                <strong className="font-semibold">Chế độ demo</strong> — nội dung và câu hỏi mẫu cài sẵn
                trong web, điểm không được lưu vào server. Backend (API + MySQL) chạy lại là bạn được học
                bài thật với điểm + XP nha!
              </span>
            </p>
          ) : null}

          {/* Cách tư duy — khối riêng theo guide "hiểu bản chất trước công thức" */}
          <section
            id="thinking-section"
            className="scroll-mt-24 rounded-[16px] bg-cream-deep p-5 sm:p-6"
          >
            <h2 className="mb-2 text-lg font-bold text-ink-900">💡 Cách tư duy</h2>
            <MarkdownContent markdown={view.thinkingSection} />
          </section>

          <MarkdownContent markdown={view.content} />

          {view.questions.length > 0 ? (
            <PracticeSection
              lessonId={view.lessonId}
              setId={view.setId}
              mode="QUIZ"
              isDemo={isDemo}
              questions={view.questions}
              demoQuestions={view.demoQuestions}
              reviewTargetId="thinking-section"
            />
          ) : null}
        </article>

        {/* Sidebar mục lục sticky — desktop */}
        <aside className="hidden lg:block">
          <nav
            aria-label="Mục lục bài học"
            className="sticky top-24 flex flex-col gap-2 rounded-[16px] border border-ink-300/30 bg-paper p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Mục lục</p>
            {toc.map((h) => (
              <a
                key={h.id}
                href={`#${h.id}`}
                className={
                  h.level === 2
                    ? "rounded-[8px] px-2 py-1 text-sm text-ink-700 transition-colors duration-200 hover:bg-cream-deep hover:text-ink-900"
                    : "rounded-[8px] px-2 py-1 pl-5 text-[13px] text-ink-500 transition-colors duration-200 hover:bg-cream-deep hover:text-ink-900"
                }
              >
                {h.text}
              </a>
            ))}
            <a
              href="#practice"
              className="rounded-[8px] px-2 py-1 text-sm font-medium text-teal-fresh-600 transition-colors duration-200 hover:bg-cream-deep"
            >
              Thực hành ngay
            </a>
          </nav>
        </aside>
      </div>
    </Container>
  );
}
