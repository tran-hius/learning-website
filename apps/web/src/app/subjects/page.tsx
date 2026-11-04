import { Construction } from "lucide-react";
import { Container } from "@/components/layout/Container";
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
          7 môn đang có trên SynapseBrain — nội dung đang được duyệt, sắp mở dần nha!
        </p>
      </header>

      {/* Phase 1: chưa có trang chi tiết môn (S2 chưa nối) → card ở trạng thái
          "sắp ra mắt" rõ ràng, KHÔG tự link vào chính nó (self-link chết). */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SUBJECTS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.slug}
              aria-disabled="true"
              className="h-full cursor-not-allowed rounded-[16px] border border-dashed border-ink-300/50 bg-paper/60 opacity-75 shadow-[0_4px_24px_rgba(0,0,0,0.04)]"
              title="Môn này sắp ra mắt — chưa mở nội dung"
            >
              <div className="flex flex-row items-start gap-3 p-5">
                <span
                  className={cn("flex size-11 shrink-0 items-center justify-center rounded-[12px] grayscale-[30%]", s.chipClass)}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="flex items-center gap-2 text-base font-semibold leading-snug text-ink-900">
                    {s.name}
                    <Badge variant="honey">sắp ra mắt</Badge>
                  </h3>
                  <p className="text-sm text-ink-500">{s.description}</p>
                </div>
              </div>
              <div className="p-5 pt-0 text-sm text-ink-500">
                Chương &amp; bài học sẽ mở dần khi nội dung được duyệt.
              </div>
            </div>
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
