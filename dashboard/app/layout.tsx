import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/lib/user-context";
import { BudgetScopeProvider } from "@/lib/budget-scope";
import { QuickAddFloat } from "@/components/quick-add-float";
import { MobileNav } from "@/components/mobile-nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Elegant serif for headings — gives the app a warm, editorial, human feel
const fraunces = Fraunces({ variable: "--font-serif", subsets: ["latin"], axes: ["opsz"] });

export const metadata: Metadata = {
  title: "N2S Platform",
  description: "Personal dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex">
        <ThemeProvider>
          <UserProvider>
            <BudgetScopeProvider>
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-auto relative">
                <div className="h-12 md:hidden shrink-0" />
                <main className="flex-1 pb-20 md:pb-0">{children}</main>
                <QuickAddFloat />
              </div>
              <MobileNav />
            </BudgetScopeProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
