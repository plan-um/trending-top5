import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "트렌딩 탑5 - 지금 뜨는 것 5개만",
  description: "실시간 트렌드를 30초 안에 파악하세요. 화제의 키워드, 뉴스, 인기 콘텐츠를 한눈에.",
  keywords: ["트렌드", "실시간", "검색어", "뉴스", "유튜브", "인기"],
  authors: [{ name: "Planum" }],
  openGraph: {
    title: "트렌딩 탑5",
    description: "지금 뜨는 것 5개만, 30초 안에 파악하기",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
