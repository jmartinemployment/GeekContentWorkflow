import type { Metadata } from "next";
import { Inter_Tight, Geist_Mono } from "next/font/google";
import { SmoothScroll } from "@/components/SmoothScroll";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.geekatyourspot.com"),
  title: "Geek Content Workflow | The AI Content Engine for Startups",
  description:
    "Geek Content Workflow gives you one workflow to build a content engine that ranks on Google, gets cited by AI, and turns visibility into customers.",
  icons: {
    icon: "/seo/favicon.png",
    apple: "/seo/apple-touch-icon.png",
  },
  openGraph: {
    title: "Geek Content Workflow | The AI Content Engine for Startups",
    description:
      "Geek Content Workflow gives you one workflow to build a content engine that ranks on Google, gets cited by AI, and turns visibility into customers.",
    images: ["/seo/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gcw-bg text-gcw-ink">
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
