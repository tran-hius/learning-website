import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-be-vietnam",
});

export const metadata: Metadata = {
  title: "Học Nè — Người bạn học cùng",
  description:
    "Học Toán, Tiếng Anh, Python cùng người bạn học dễ thương: bài học ngắn, lộ trình nghề nghiệp, thi thử và streak mỗi ngày.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={beVietnamPro.variable}>
        <Header />
        <div className="flex min-h-[calc(100vh-4rem)]">
          <Sidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
