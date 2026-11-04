import { Construction } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * /lessons/[slug] — trang bài học placeholder.
 * Khi S4 GET /lessons chạy sẽ fetch qua src/lib/api/subjects.ts + render Markdown/KaTeX.
 */
export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <Container className="flex max-w-3xl flex-col gap-6 py-8 sm:py-10">
      <header>
        <Badge variant="coral" className="mb-2">
          Bài học · sắp ra mắt
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Bài học đang được chuẩn bị ✍️
        </h1>
        <p className="mt-2 text-[15px] text-ink-700">
          Bài có mã <code className="rounded bg-cream-deep px-1.5 py-0.5 font-mono text-sm">{slug}</code> sẽ mở
          ngay khi nội dung được duyệt. Trong lúc chờ, bạn thử mục “Tiếp tục học” ở trang chủ nha!
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Bài học sẽ có gì?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-[15px] text-ink-700">
          <p>• Phần “Cách tư duy” — hiểu bản chất trước khi vào công thức.</p>
          <p>• Ví dụ giải từng bước, công thức toán hiển thị đẹp bằng LaTeX.</p>
          <p>• Câu hỏi trắc nghiệm cuối bài — có gợi ý 2 bậc nếu bí.</p>
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 rounded-[12px] bg-cream-deep p-4 text-sm text-ink-700">
        <Construction className="size-4 shrink-0 text-honey-500" aria-hidden />
        Trang này đang xây — dữ liệu thật sẽ lấy từ API khi backend sẵn sàng.
      </p>
    </Container>
  );
}
