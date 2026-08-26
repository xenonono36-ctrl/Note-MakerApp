import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import "./reactbits.css";
import "./controls.css";
import "./aeonik.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = { title: "Chrono Notes", description: "A focused AI study note builder powered by Gemini." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={manrope.variable}>{children}</body></html>;
}