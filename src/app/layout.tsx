import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Website Học Tập",
  description: "Nền tảng học tập trực tuyến",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
