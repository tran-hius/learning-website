import Link from "next/link";
import { Home, Sparkles } from "lucide-react";
import { SUBJECTS } from "@/lib/subjects-data";
import { cn } from "@/lib/utils";

/**
 * Sidebar danh sách môn học (Server Component — không state).
 * Desktop: cột trái cố định; Mobile: ẩn, chuyển thành dải chip ngang trên Header.
 */
export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-ink-300/25 bg-cream px-4 py-6 lg:flex">
      <Link
        href="/"
        className="mb-4 flex items-center gap-2 rounded-[12px] px-3 py-2 text-[15px] font-semibold text-ink-900 transition-colors hover:bg-cream-deep"
      >
        <Home className="size-4 text-teal-fresh-500" aria-hidden />
        Trang chủ
      </Link>

      <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-300">
        Hành trình
      </p>
      <nav aria-label="Tiến độ và lộ trình" className="mb-3 flex flex-col gap-0.5">
        <Link
          href="/progress"
          className="flex min-h-[44px] items-center gap-2.5 rounded-[12px] px-3 text-[15px] text-ink-700 transition-colors duration-150 hover:bg-cream-deep hover:text-ink-900"
        >
          <span aria-hidden>📊</span> Tiến độ của tôi
        </Link>
        <Link
          href="/roadmaps"
          className="flex min-h-[44px] items-center gap-2.5 rounded-[12px] px-3 text-[15px] text-ink-700 transition-colors duration-150 hover:bg-cream-deep hover:text-ink-900"
        >
          <span aria-hidden>🛤️</span> Lộ trình nghề nghiệp
        </Link>
      </nav>

      <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-300">
        Môn học
      </p>
      <nav aria-label="Danh sách môn học" className="flex flex-col gap-0.5">
        {SUBJECTS.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.slug}
              href="/subjects"
              className="flex min-h-[44px] items-center gap-2.5 rounded-[12px] px-3 text-[15px] text-ink-700 transition-colors duration-150 hover:bg-cream-deep hover:text-ink-900"
            >
              <span
                className={cn("flex size-7 items-center justify-center rounded-full", s.chipClass)}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              {s.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[16px] bg-cream-deep p-4 text-sm text-ink-700">
        <Sparkles className="mb-1 size-4 text-honey-500" aria-hidden />
        Môn mới &amp; bài học mới sẽ xuất hiện tại đây — đang dần bổ sung nha!
      </div>
    </aside>
  );
}
