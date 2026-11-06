import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Đại Thế Kỷ – Quản lý & Đăng tin !",
  description: "Đồng bộ danh sách nhà và đăng tin lên mạng xã hội!!!",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-muted/30 antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
