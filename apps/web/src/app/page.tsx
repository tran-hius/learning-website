import Link from "next/link";
import { ArrowRight, BookOpenCheck, Clock3, Flame, Map, NotebookPen } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SUBJECTS, ROADMAPS } from "@/lib/subjects-data";
import { cn } from "@/lib/utils";

/**
 * Trang chủ học sinh — theo guide mục 7: chào ấm, "Tiếp tục học" từ chỗ dừng,
 * dải môn học, lộ trình gần nhất. Phase 1 dùng dữ liệu demo tiếng Việt thật,
 * khi API /auth/me + /progress/overview chạy sẽ thay bằng dữ liệu người dùng.
 */
export default function HomePage() {
  return (
    <Container className="flex flex-col gap-10 py-8 sm:py-10">
      {/* Chào hỏi ấm áp */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Chào bạn! 👋
          </h1>
          <p className="mt-1 text-[15px] text-ink-700">
            Hôm nay bạn muốn học gì trước — tiếp tục bài đang dở hay làm đề nhỏ cho nóng?
          </p>
        </div>
        {/* CTA primary — duy nhất 1 nút theo guide */}
        <Button size="lg" className="animate-pop-in" aria-label="Học tiếp bài đang dở">
          <NotebookPen aria-hidden />
          Học tiếp nè
        </Button>
      </section>

      {/* Tiếp tục học + banner đề thi dạng sticky note nghiêng nhẹ */}
      <section className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Tiếp tục học</CardTitle>
              <CardDescription>Bạn đang dở 1 bài ở đây — quay lại là hiểu liền!</CardDescription>
            </div>
            <Badge variant="mint">Đang học</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-[12px] bg-cream-deep p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-ink-900">
                  🐍 Python · Vòng lặp <code className="rounded bg-paper px-1 font-mono text-sm">for</code>
                </p>
                <span className="text-sm font-medium text-teal-fresh-600">60%</span>
              </div>
              <Progress value={60} className="mt-3" indicatorClassName="bg-teal-fresh-400" />
              <p className="mt-2 flex items-center gap-3 text-xs text-ink-500">
                <span className="flex items-center gap-1">
                  <Clock3 className="size-3.5" aria-hidden /> còn ~12 phút
                </span>
                <span className="flex items-center gap-1">
                  <BookOpenCheck className="size-3.5" aria-hidden /> bài 3/5 chương đầu
                </span>
              </p>
            </div>
            <p className="text-sm text-ink-500">
              Xong bài này bạn mở khoá mục “Luyện vòng lặp” — cố lên chút nữa thôi!
            </p>
          </CardContent>
        </Card>

        {/* Sticky note nghiêng nhẹ — chi tiết "khó template copy" theo guide mục 6 */}
        <div className="rotate-2 rounded-[16px] bg-honey-50 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] ring-1 ring-honey-100">
          <p className="flex items-center gap-2 font-semibold text-ink-900">
            <Flame className="size-4 text-coral-500" aria-hidden />
            Chuỗi học còn nóng hổi!
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            Bạn đã học <strong>5 ngày liên tiếp</strong> 🔥 — tối nay làm đề Toán 10 phút là
            giữ chuỗi ngày thứ 6 nha!
          </p>
          <p className="mt-3 text-xs text-ink-500">
            (Dữ liệu demo — đăng nhập xong sẽ đếm streak thật của bạn.)
          </p>
        </div>
      </section>

      {/* Dải môn học dạng chip màu theo môn */}
      <section>
        <h2 className="text-lg font-bold text-ink-900">Chọn môn học</h2>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {SUBJECTS.map((s) => (
            <Link
              key={s.slug}
              href="/subjects"
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-transform duration-150 hover:scale-105",
                s.chipClass,
              )}
            >
              <span aria-hidden>{s.emoji}</span>
              {s.name}
            </Link>
          ))}
        </div>
      </section>

      {/* 3 lộ trình nghề nghiệp — card có mô tả thật, không 3 cột icon đều tăm tắp kiểu template */}
      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
              <Map className="size-5 text-teal-fresh-500" aria-hidden />
              Lộ trình nghề nghiệp
            </h2>
            <p className="mt-1 text-sm text-ink-700">
              Mỗi lộ trình chia thành các mốc nhỏ — bạn chỉ cần đi từng bước một thôi.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {ROADMAPS.map((r) => (
            <Link key={r.slug} href="/subjects" className="group">
              <Card className="h-full transition-transform duration-200 ease-out group-hover:-translate-y-0.5">
                <CardHeader>
                  <span
                    className={cn(
                      "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
                      r.chipClass,
                    )}
                  >
                    <span aria-hidden>{r.emoji}</span>
                    Lộ trình
                  </span>
                  <CardTitle className="mt-2">{r.title}</CardTitle>
                  <CardDescription>{r.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-1 text-sm font-medium text-teal-fresh-600">
                  Xem các mốc
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </Container>
  );
}
