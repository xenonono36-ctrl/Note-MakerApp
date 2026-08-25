import type { Metadata } from "next";
import "./globals.css";
import "./reactbits.css";
import "./controls.css";
import "./aeonik.css";

export const metadata: Metadata = { title: "Lumen Notes", description: "A focused AI study note builder powered by Gemini." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}