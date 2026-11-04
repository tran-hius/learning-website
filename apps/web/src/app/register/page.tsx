import Link from "next/link";
import { Github, GraduationCap, Mail } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RegisterForm } from "./register-form";

/** /register — tạo tài khoản (A1). Đăng ký xong backend tự set cookie phiên. */
export default function RegisterPage() {
  return (
    <Container className="flex max-w-md flex-col justify-center py-10 sm:py-16">
      <Card>
        <CardHeader className="items-center text-center">
          <span className="mb-1 flex size-12 items-center justify-center rounded-[12px] bg-teal-fresh-400 text-white">
            <GraduationCap className="size-6" aria-hidden />
          </span>
          <CardTitle className="text-xl">Mình học cùng nhau nha! 🌱</CardTitle>
          <CardDescription>
            Tạo tài khoản để streak, XP và lộ trình của bạn được lưu lại.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <RegisterForm />

          <div className="flex items-center gap-3 text-xs text-ink-500">
            <span className="h-px flex-1 bg-ink-300/40" />
            hoặc
            <span className="h-px flex-1 bg-ink-300/40" />
          </div>

          <div className="flex flex-col gap-2">
            <a
              href="/api/v1/auth/oauth/google?callbackUrl=/"
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] border border-ink-300/60 bg-paper text-[15px] font-semibold text-ink-900 transition-colors hover:bg-cream-deep"
            >
              <Mail className="size-4" aria-hidden />
              Đăng ký bằng Google
            </a>
            <a
              href="/api/v1/auth/oauth/github?callbackUrl=/"
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] border border-ink-300/60 bg-paper text-[15px] font-semibold text-ink-900 transition-colors hover:bg-cream-deep"
            >
              <Github className="size-4" aria-hidden />
              Đăng ký bằng GitHub
            </a>
          </div>

          <p className="text-center text-sm text-ink-700">
            Đã có tài khoản?{" "}
            <Link href="/login" className="font-semibold text-teal-fresh-600 underline-offset-4 hover:underline">
              Đăng nhập thôi
            </Link>
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}
