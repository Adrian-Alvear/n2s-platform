import type { Metadata } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/* Three roles, no more (docs/BUILD-PROMPT.md §5.3). */
const display = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});
const text = Inter({
  subsets: ["latin"],
  variable: "--font-text",
});
const numeric = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-numeric",
});

export const metadata: Metadata = {
  title: "N2S",
  description: "A software studio for problems that don't have a product yet.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${text.variable} ${numeric.variable} n2s-grain`}
      >
        {/* Procedural atmosphere — not video (§8). Phase 2 replaces this
            with the real nebula shader behind the same layer. */}
        <div aria-hidden className="n2s-atmosphere">
          <div className="n2s-aurora" />
        </div>
        {children}
      </body>
    </html>
  );
}
