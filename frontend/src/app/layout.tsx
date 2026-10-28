import type { Metadata, Viewport } from "next";
import { Chivo, Geist } from "next/font/google";
import { Footer, Nav } from "@/components/Chrome";
import { SmoothScroll } from "@/components/SmoothScroll";
import "./globals.css";
import "./home.css";
import "./debate.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const chivo = Chivo({ subsets: ["latin"], variable: "--font-chivo", weight: ["400", "700", "900"], display: "block" });

const TITLE = "StockDuel | AI Stock Debate System";
const DESCRIPTION =
  "Two AI analysts debate any two stocks using live market data, and a third AI fact-checks every claim before scoring 10 weighted factors. For education only. Not financial advice.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website" },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = { themeColor: "#0c0d11", width: "device-width", initialScale: 1 };

/** Runs before the first paint. The opening doors play once per browser session, on the home page only,
 *  and never for visitors who ask for reduced motion. The class it sets keeps the doors over the screen
 *  from the very first frame, so the page never flashes before they open. */
const DOORS_SCRIPT = `try{var d=document.documentElement;d.classList.add("js");if(location.pathname==="/"&&!sessionStorage.getItem("sd-doors")&&!matchMedia("(prefers-reduced-motion: reduce)").matches)d.classList.add("doors-on")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${chivo.variable}`} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: DOORS_SCRIPT }} />
      </head>
      <body>
        <SmoothScroll />
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
