import Link from "next/link";
import { ArrowLeft, Clock, History, Trophy } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getExamHistoryServer } from "@/lib/api/exam.server";

/**
 * /exams/[id]/history — lịch sử thi (contract E5, task TASK-005 mục 4).
 * Server fetch + cookie; API lỗi → trạng thái trống trung thực, không bịa số liệu.
 */

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
}

export default async function ExamHistoryPage() {
  const items = await getExamHistoryServer();

  return (
    <Container className="flex max-w-3xl flex-col gap-6 py-8 sm:py-10">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="honey">
            <History className="mr-1 inline size-3.5" aria-hidden /> Lịch sử thi
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Các lượt thi của bạn
        </h1>
        <Link
          href="/"
          className="inline-flex min-h-[44px] w-fit items-center gap-2 text-sm font-semibold text-teal-fresh-600 underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden /> Về trang chủ
        </Link>
      </header>

      {items === null ? (
        <Card>
          <CardContent className="flex flex-col gap-2 py-8 text-center text-[15px] text-ink-700">
            <p>Chưa tải được lịch sử thi từ máy chủ (chưa đăng nhập hoặc API chưa chạy).</p>
            <p className="text-sm text-ink-500">
              Đăng nhập rồi thử lại nhé — lịch sử sẽ hiện ngay khi có lượt thi đã nộp.
            </p>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-2 py-8 text-center text-[15px] text-ink-700">
            <p>Chưa có lượt thi nào được ghi lại.</p>
            <p className="text-sm text-ink-500">
              Vào một đề thi và nộp bài — kết quả sẽ xuất hiện ở đây ngay.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item, i) => (
            <Card key={item.sessionId}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                  <span className="flex items-center gap-2">
                    <Trophy
                      className={item.passed ? "size-5 text-honey-500" : "size-5 text-ink-300"}
                      aria-hidden
                    />
                    {item.subjectName ?? "Đề thi tự chọn"} ·{" "}
                    {item.kind === "PLACEMENT_TEST" ? "Test đầu vào" : "Thi thử"}
                  </span>
                  <Badge variant={item.passed ? "mint" : "coral"}>
                    {item.passed ? "Đạt" : "Chưa đạt"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5 text-[15px] text-ink-700">
                <p>
                  Điểm: <strong className="font-semibold text-ink-900">{item.score}</strong> đúng ·{" "}
                  {item.percent}%
                </p>
                <p className="flex items-center gap-1.5 text-sm text-ink-500">
                  <Clock className="size-4 shrink-0" aria-hidden />
                  Nộp lúc{" "}
                  {new Date(item.submittedAt).toLocaleString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}{" "}
                  · làm trong {fmtDuration(item.timeSpentSec)}
                </p>
                <span className="sr-only">Lượt thi #{i + 1}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
