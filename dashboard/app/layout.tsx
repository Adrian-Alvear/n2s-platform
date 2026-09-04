import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/lib/user-context";
import { BudgetScopeProvider } from "@/lib/budget-scope";
import { AppShell } from "@/components/ecosystem/AppShell";
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
      {/* The ecosystem is the whole shell: no sidebar, no bottom nav, no page
          chrome. Navigation happens by flying into a node. */}
      <body className="min-h-full bg-black">
        <ThemeProvider>
          <UserProvider>
            <BudgetScopeProvider>
              <AppShell>{children}</AppShell>
            </BudgetScopeProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
