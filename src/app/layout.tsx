import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "기억을 꼭 붙잡아!! - 찬란했던 나의 이야기",
  description: "기억이 흐려지기 전에, 지금 목소리로 남겨두세요.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "내 목소리 일기" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ea580c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-stone-50 text-stone-900 min-h-screen">
        <div className="mx-auto max-w-md min-h-screen flex flex-col">{children}</div>
      </body>
    </html>
  );
}
