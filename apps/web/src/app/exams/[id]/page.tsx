import { Construction } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * /exams/[id] — trang thi placeholder.
 * Khi E1–E4 chạy sẽ tạo session qua src/lib/api/exams.ts, đồng hồ vòng tròn + autosave.
 */
export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Container className="flex max-w-3xl flex-col gap-6 py-8 sm:py-10">
      <header>
        <Badge variant="coral" className="mb-2">
          Thi thử · sắp ra mắt
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Phòng thi đang được dọn dẹp 📝
        </h1>
        <p className="mt-2 text-[15px] text-ink-700">
          Đề thi có mã <code className="rounded bg-cream-deep px-1.5 py-0.5 font-mono text-sm">{id}</code> sẽ
          sớm mở. Mỗi câu 1 card, có đồng hồ đếm giờ và tự lưu bài làm — đừng lo lỡ tay tắt tab!
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Luồng thi sẽ thế nào?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-[15px] text-ink-700">
          <p>• Bấm “Bắt đầu” → nhận đề 60% câu vừa, 20% dễ, 20% khó.</p>
          <p>• Trả lời được lưu tự động liên tục (“Đã lưu ✓”).</p>
          <p>• Nộp bài là biết điểm ngay + câu sai kèm giải thích chi tiết.</p>
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 rounded-[12px] bg-cream-deep p-4 text-sm text-ink-700">
        <Construction className="size-4 shrink-0 text-honey-500" aria-hidden />
        Trang này đang xây — dữ liệu thật sẽ lấy từ API khi backend sẵn sàng.
      </p>
    </Container>
  );
}
