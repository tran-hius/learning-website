import Link from "next/link";
import { Flame, GraduationCap } from "lucide-react";
import { SUBJECTS } from "@/lib/subjects-data";
import { cn } from "@/lib/utils";

/**
 * Header: logo, streak 🔥 và avatar (Server Component).
 * streak/avatar tạm dùng dữ liệu demo — khi API /auth/me (A7) chạy sẽ thay bằng dữ liệu thật.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-ink-300/25 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        {/* Logo — chữ + icon, tone ấm theo brand */}
        <Link href="/" className="flex items-center gap-2 font-bold text-ink-900">
          <span className="flex size-9 items-center justify-center rounded-[12px] bg-coral-400 text-white">
            <GraduationCap className="size-5" aria-hidden />
          </span>
          <span className="text-lg tracking-tight">
            Học<span className="text-coral-500">Nè</span>
          </span>
        </Link>

        {/* Dải chip môn học cho mobile/desktop nhỏ */}
        <nav aria-label="Môn học" className="ml-2 hidden min-w-0 flex-1 gap-1.5 overflow-x-auto md:flex lg:hidden">
          {SUBJECTS.slice(0, 5).map((s) => (
            <Link
              key={s.slug}
              href="/subjects"
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-transform duration-150 hover:scale-105",
                s.chipClass,
              )}
            >
              {s.name}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* Streak badge — icon bật nhẹ pop theo guide mục 5 */}
          <span
            className="flex items-center gap-1 rounded-full bg-honey-100 px-3 py-1.5 text-sm font-semibold text-honey-500 animate-soft-float"
            title="Số ngày học liên tiếp"
          >
            <Flame className="size-4" aria-hidden />
            5
          </span>

          {/* Avatar tạm: chào by initials — thay bằng ảnh khi có avatarUrl */}
          <span
            className="flex size-9 items-center justify-center rounded-full bg-teal-fresh-400 text-sm font-bold text-white"
            title="Bạn chưa đăng nhập — demo avatar"
          >
            BẠN
          </span>
        </div>
      </div>
    </header>
  );
}
