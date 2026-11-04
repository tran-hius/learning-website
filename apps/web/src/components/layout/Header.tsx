import Link from "next/link";
import { Flame, GraduationCap } from "lucide-react";
import { SUBJECTS } from "@/lib/subjects-data";
import { getMeServer } from "@/lib/api/auth.server";
import { cn } from "@/lib/utils";
import { LogoutButton } from "./LogoutButton";

/**
 * Header (Server Component): logo SynapseBrain, dải chip môn học và
 * trạng thái đăng nhập thật từ GET /auth/me (A7). Chưa login → nút
 * Đăng nhập/Đăng ký; đã login → avatar + tên + streak + đăng xuất.
 */
export async function Header() {
  const me = await getMeServer().catch(() => null);

  return (
    <header className="sticky top-0 z-10 border-b border-ink-300/25 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        {/* Logo — chữ + icon, tone ấm theo brand */}
        <Link href="/" className="flex items-center gap-2 font-bold text-ink-900">
          <span className="flex size-9 items-center justify-center rounded-[12px] bg-coral-400 text-white">
            <GraduationCap className="size-5" aria-hidden />
          </span>
          <span className="text-lg tracking-tight">
            Synapse<span className="text-coral-500">Brain</span>
          </span>
        </Link>

        {/* Dải chip môn học cho mobile/desktop nhỏ — touch target ≥ 44px (guide mục 9) */}
        <nav aria-label="Môn học" className="ml-2 hidden min-w-0 flex-1 gap-1.5 overflow-x-auto md:flex lg:hidden">
          {SUBJECTS.slice(0, 5).map((s) => (
            <Link
              key={s.slug}
              href="/subjects"
              className={cn(
                "flex min-h-[44px] items-center whitespace-nowrap rounded-full px-3 text-sm font-medium transition-transform duration-150 hover:scale-105",
                s.chipClass,
              )}
            >
              <span aria-hidden className="mr-1">{s.emoji}</span>
              {s.name}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {me ? (
            <>
              {/* Streak badge — icon bật nhẹ pop theo guide mục 5 (dữ liệu thật từ A7) */}
              <span
                className="flex items-center gap-1 rounded-full bg-honey-100 px-3 py-1.5 text-sm font-semibold text-honey-500 animate-soft-float"
                title="Số ngày học liên tiếp"
              >
                <Flame className="size-4" aria-hidden />
                {me.stats.currentStreak}
              </span>

              <Link
                href="/me"
                className="flex min-h-[44px] items-center gap-2 rounded-full pr-2 transition-colors hover:bg-cream-deep"
                title="Trang cá nhân"
              >
                {/* Avatar: initials — thay bằng ảnh khi có avatarUrl */}
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-fresh-400 text-sm font-bold text-white">
                  {me.user.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden max-w-28 truncate text-sm font-semibold text-ink-900 sm:block">
                  {me.user.name}
                </span>
              </Link>

              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="flex min-h-[44px] items-center rounded-[12px] px-3 text-sm font-semibold text-ink-900 transition-colors hover:bg-cream-deep"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="flex min-h-[44px] items-center rounded-[12px] bg-coral-400 px-4 text-sm font-semibold text-white transition-colors hover:bg-coral-500"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
