import Link from "next/link";
import { AtSign, Flame, LockKeyhole, Sparkles } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMeServer } from "@/lib/api/auth.server";
import { ChangePasswordForm } from "./change-password-form";

/**
 * /me — trang cá nhân tối giản: tên, email, streak (A7) + form đổi mật khẩu (U2).
 * XP chưa có endpoint thật (G1 /progress/overview chưa chạy, A7 không trả XP)
 * → hiện trạng thái trống rõ ràng, không đắp số liệu fake (guide mục 6).
 */
export default async function MePage() {
  const me = await getMeServer().catch(() => null);

  if (!me) {
    return (
      <Container className="flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-cream-deep">
          <LockKeyhole className="size-5 text-ink-700" aria-hidden />
        </span>
        <h1 className="text-xl font-bold text-ink-900">Bạn chưa đăng nhập nè</h1>
        <p className="text-[15px] text-ink-700">
          Đăng nhập để xem trang cá nhân, streak và tiến độ học của bạn nhé!
        </p>
        <Link
          href="/login"
          className="mt-2 flex min-h-[44px] items-center rounded-[12px] bg-coral-400 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-coral-500"
        >
          Đến trang đăng nhập
        </Link>
      </Container>
    );
  }

  return (
    <Container className="flex max-w-2xl flex-col gap-6 py-8 sm:py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Chào {me.user.name}! 👋
        </h1>
        <p className="mt-1 text-[15px] text-ink-700">
          Đây là góc học tập riêng của bạn — giữ lửa nhé!
        </p>
      </header>

      {/* Thông tin cơ bản + streak */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin của bạn</CardTitle>
          <CardDescription>Vai trò: {me.user.role}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-[15px] text-ink-900">
            <AtSign className="size-4 text-teal-fresh-500" aria-hidden />
            {me.user.email}
          </p>
          <p className="flex items-center gap-2 text-[15px] text-ink-900">
            <Flame className="size-4 text-coral-500" aria-hidden />
            Chuỗi ngày học liên tiếp: <strong>{me.stats.currentStreak}</strong>
            <span className="text-sm text-ink-500">(kỷ lục {me.stats.longestStreak} ngày)</span>
          </p>
          <p className="flex items-start gap-2 rounded-[10px] bg-cream-deep p-3 text-sm text-ink-700">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-honey-500" aria-hidden />
            XP &amp; cấp độ sẽ hiển thị tại đây khi endpoint tiến độ (G1) được bật —
            đang chờ backend nha!
          </p>
        </CardContent>
      </Card>

      {/* Đổi mật khẩu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockKeyhole className="size-4 text-teal-fresh-500" aria-hidden />
            Đổi mật khẩu
          </CardTitle>
          <CardDescription>Mật khẩu mới cần ít nhất 8 ký tự.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </Container>
  );
}
