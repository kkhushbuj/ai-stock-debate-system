import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Footer, Nav } from "@/components/Chrome";
import { SmoothScroll } from "@/components/SmoothScroll";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

const TITLE = "StockDuel | AI Stock Debate System";
const DESCRIPTION =
  "Two AI analysts debate any two stocks using live market data, and a third AI fact-checks every claim before scoring 10 weighted factors. For education only. Not financial advice.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website" },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = { themeColor: "#06080b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable} data-theme="dark" suppressHydrationWarning>
      <body>
        <SmoothScroll />
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
