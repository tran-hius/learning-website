import Link from "next/link";
import { Construction } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SUBJECTS } from "@/lib/subjects-data";
import { cn } from "@/lib/utils";

/**
 * /subjects — danh sách 7 môn học. Phase 1: danh sách tĩnh từ subjects-data;
 * khi S1 GET /subjects chạy sẽ fetch qua src/lib/api/subjects.ts.
 */
export default function SubjectsPage() {
  return (
    <Container className="flex flex-col gap-8 py-8 sm:py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Môn học</h1>
        <p className="mt-1 text-[15px] text-ink-700">
          7 môn đang có trên Học Nè — chọn 1 môn để xem các chương nhé!
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SUBJECTS.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.slug} href="/subjects" className="group">
              <Card className="h-full transition-transform duration-200 ease-out group-hover:-translate-y-0.5">
                <CardHeader className="flex-row items-start gap-3">
                  <span
                    className={cn("flex size-11 shrink-0 items-center justify-center rounded-[12px]", s.chipClass)}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {s.name}
                      <Badge variant="honey">sắp ra mắt</Badge>
                    </CardTitle>
                    <CardDescription>{s.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-ink-500">
                  Chương &amp; bài học sẽ mở dần khi nội dung được duyệt.
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <p className="flex items-center gap-2 rounded-[12px] bg-cream-deep p-4 text-sm text-ink-700">
        <Construction className="size-4 shrink-0 text-honey-500" aria-hidden />
        Trang chi tiết từng môn đang được hoàn thiện — dữ liệu thật sẽ tới ngay sau khi backend chạy.
      </p>
    </Container>
  );
}
