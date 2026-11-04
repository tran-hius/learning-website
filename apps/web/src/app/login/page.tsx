import Link from "next/link";
import { Github, GraduationCap, Mail } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoginForm } from "./login-form";

/**
 * /login — đăng nhập email/mật khẩu + OAuth (A2, A3).
 * OAuth trỏ GET /api/v1/auth/oauth/:provider (backend redirect + set cookie phiên).
 */
export default function LoginPage() {
  return (
    <Container className="flex max-w-md flex-col justify-center py-10 sm:py-16">
      <Card>
        <CardHeader className="items-center text-center">
          <span className="mb-1 flex size-12 items-center justify-center rounded-[12px] bg-coral-400 text-white">
            <GraduationCap className="size-6" aria-hidden />
          </span>
          <CardTitle className="text-xl">Chào bạn đã quay lại! 👋</CardTitle>
          <CardDescription>
            Đăng nhập để giữ streak, lưu tiến độ và tiếp tục học nhé.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <LoginForm />

          <div className="flex items-center gap-3 text-xs text-ink-500">
            <span className="h-px flex-1 bg-ink-300/40" />
            hoặc
            <span className="h-px flex-1 bg-ink-300/40" />
          </div>

          {/* OAuth — redirect ra provider, callback A4 sẽ đăng nhập hộ */}
          <div className="flex flex-col gap-2">
            <a
              href="/api/v1/auth/oauth/google?callbackUrl=/"
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] border border-ink-300/60 bg-paper text-[15px] font-semibold text-ink-900 transition-colors hover:bg-cream-deep"
            >
              <Mail className="size-4" aria-hidden />
              Đăng nhập bằng Google
            </a>
            <a
              href="/api/v1/auth/oauth/github?callbackUrl=/"
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] border border-ink-300/60 bg-paper text-[15px] font-semibold text-ink-900 transition-colors hover:bg-cream-deep"
            >
              <Github className="size-4" aria-hidden />
              Đăng nhập bằng GitHub
            </a>
          </div>

          <p className="text-center text-sm text-ink-700">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="font-semibold text-teal-fresh-600 underline-offset-4 hover:underline">
              Đăng ký ngay nè
            </Link>
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}
