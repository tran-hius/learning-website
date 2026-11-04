import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/badge";
import { getSubjectsServer } from "@/lib/api/content.server";
import { DEMO_SUBJECTS } from "@/lib/demo/demo-subjects";
import { SUBJECTS } from "@/lib/subjects-data";
import { cn } from "@/lib/utils";

/**
 * /subjects — fetch S1 GET /subjects thật; API/DB chưa chạy → demo mode
 * (banner rõ ràng, không fake như thật). Card dẫn tới /subjects/[slug].
 */

/** Map màu/icon thật từ DB sang chipClass tĩnh theo slug (Tailwind không sinh runtime). */
function chipClassForSlug(slug: string): string {
  return SUBJECTS.find((s) => s.slug === slug)?.chipClass ?? "bg-cream-deep text-ink-700";
}

function iconForSlug(slug: string, fallbackIcon: string): string {
  return SUBJECTS.find((s) => s.slug === slug)?.emoji ?? fallbackIcon;
}

export default async function SubjectsPage() {
  const subjects = await getSubjectsServer();
  const isDemo = !subjects;
  const list = subjects ?? DEMO_SUBJECTS;

  return (
    <Container className="flex flex-col gap-8 py-8 sm:py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Môn học</h1>
        <p className="mt-1 text-[15px] text-ink-700">
          {isDemo
            ? "Đang ở chế độ demo — vào thẳng môn Toán để xem thử bài học nhé!"
            : `${list.length} môn đang mở trên SynapseBrain — chọn môn để xem lộ trình nha!`}
        </p>
      </header>

      {isDemo ? (
        <p className="flex items-start gap-2 rounded-[12px] border border-dashed border-honey-300 bg-honey-50 px-4 py-3 text-sm text-ink-700 animate-pop-in">
          <FlaskConical className="mt-0.5 size-4 shrink-0 text-honey-500" aria-hidden />
          <span>
            <strong className="font-semibold">Chế độ demo</strong> — danh sách môn mẫu cài sẵn trong web
            vì backend chưa chạy. Khi API sẵn sàng, danh sách thật (S1) sẽ tự thay thế.
          </span>
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((s) => {
          return (
            <Link
              key={s.id}
              href={`/subjects/${s.slug}`}
              className="group flex h-full flex-col justify-between rounded-[16px] border border-ink-300/30 bg-paper p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
            >
              <div className="flex flex-row items-start gap-3">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-[12px] text-xl",
                    chipClassForSlug(s.slug),
                  )}
                  style={
                    chipClassForSlug(s.slug) === "bg-cream-deep text-ink-700"
                      ? { backgroundColor: `${s.color}22` }
                      : undefined
                  }
                  aria-hidden
                >
                  {iconForSlug(s.slug, s.icon)}
                </span>
                <div>
                  <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold leading-snug text-ink-900">
                    {s.name}
                    {isDemo ? <Badge variant="honey">demo</Badge> : null}
                  </h3>
                  <p className="text-sm text-ink-500">{s.description ?? "Nội dung đang được duyệt."}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-ink-500">
                {s.chapterCount > 0
                  ? `${s.chapterCount} chương · xem lộ trình →`
                  : "Chương sẽ mở dần khi nội dung được duyệt."}
              </p>
            </Link>
          );
        })}
      </div>
    </Container>
  );
}
