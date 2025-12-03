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
  title: "Trending Top 10 - 트렌딩 탑10",
  description: "실시간 트렌드를 30초 안에 파악하세요. Real-time trends at a glance.",
  keywords: ["트렌드", "실시간", "trending", "viral", "news", "social"],
  authors: [{ name: "Planum" }],
  openGraph: {
    title: "Trending Top 10",
    description: "지금 뜨는 것 10개만 / Top 10 trending now",
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
