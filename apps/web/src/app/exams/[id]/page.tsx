import Link from "next/link";
import { History, ListChecks } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/badge";
import { ExamRunner } from "@/components/exam/ExamRunner";

/**
 * /exams/[id] — phòng thi (TASK-005, contract mục 5 E1–E4).
 * `id` = examBankId. Flow thi chạy trong ExamRunner (client): tạo session,
 * đếm ngược tuyệt đối theo expiresAt, autosave progress, nộp + kết quả.
 */
export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Container className="flex max-w-3xl flex-col gap-6 py-8 sm:py-10">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="coral">Thi thử</Badge>
          <Badge variant="outline">
            <ListChecks className="mr-1 inline size-3.5" aria-hidden /> Đề 20 câu · tự chấm
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Phòng thi — bình tĩnh và làm đều tay nha! 📝
        </h1>
        <p className="text-[15px] text-ink-700">
          Câu trả lời được lưu tự động liên tục — lỡ tắt tab cũng không mất bài làm.
        </p>
      </header>

      <ExamRunner examBankId={id} />

      <Link
        href={`/exams/${encodeURIComponent(id)}/history`}
        className="inline-flex min-h-[44px] w-fit items-center gap-2 rounded-[12px] px-4 text-[15px] font-semibold text-teal-fresh-600 underline-offset-4 transition-colors duration-200 hover:underline"
      >
        <History className="size-4" aria-hidden /> Lịch sử các lượt thi
      </Link>
    </Container>
  );
}
