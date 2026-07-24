import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FirstVisitNotice } from "@/components/lotto/FirstVisitNotice";
import { AppNav } from "@/components/lotto/AppNav";
import { Footer } from "@/components/lotto/Footer";
import { Analytics } from "@vercel/analytics/next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
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
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} (LottoLab) — 로또 번호 생성기 · 통계 · 판매점 찾기`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "번호 생성기, 예산 기반 추천, 역대 당첨번호 통계, 전국 판매점 찾기까지 한 곳에서 무료로 이용하는 로또 정보 도구 모음입니다. 당첨을 보장하지 않는 재미 목적의 서비스입니다.",
  verification: {
    google: "5IgXgkeaDCBmlJl1UKGnyCMVSbSjVd43RudqvWmtti0",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <FirstVisitNotice />
        <AppNav />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
