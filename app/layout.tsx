import type { Metadata, Viewport } from "next";
import Providers from "@/components/common/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyPKU - AI 맞춤형 식단 관리",
  description: "PKU 환자와 일반 사용자를 위한 AI 기반 맞춤형 식단 관리 서비스",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MyPKU",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6366f1",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 safe-area-top safe-area-bottom">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
