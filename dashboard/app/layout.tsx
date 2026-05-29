import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { QuickAddFloat } from "@/components/quick-add-float";
import { MobileNav } from "@/components/mobile-nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "N2S Family",
  description: "Family budget tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex">
        <ThemeProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-auto relative">
            {/* offset for mobile top bar */}
            <div className="h-12 md:hidden shrink-0" />
            <main className="flex-1 pb-20 md:pb-0">{children}</main>
            <QuickAddFloat />
          </div>
          <MobileNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
