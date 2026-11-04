"use client";

import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Mascot } from "@/components/feedback/Mascot";
import { Button } from "@/components/ui/button";

/**
 * 404 — trang lỗi thân thiện với mascot "Bút Chì" (guide mục 4/6: động viên,
 * không đáng sợ; CTA rõ ràng về trang chủ).
 */
export default function NotFound() {
  return (
    <Container className="flex max-w-md flex-col items-center gap-5 py-16 text-center">
      <Mascot mood="encourage" className="size-28" />
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">
        Hông tìm thấy trang này rồi 🐾
      </h1>
      <p className="text-[15px] text-ink-700">
        Đường dẫn này không tồn tại hoặc đã bị dời — Bút Chì cùng bạn quay về chỗ học nha!
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center rounded-[12px] bg-teal-fresh-500 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-teal-fresh-600"
        >
          Về trang chủ
        </Link>
        <Button variant="outline" onClick={() => history.back()}>
          Quay lại trang trước
        </Button>
      </div>
    </Container>
  );
}
