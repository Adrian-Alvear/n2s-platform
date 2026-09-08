import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * The public face (docs/BUILD-PROMPT.md §2.1).
 * The hub has no site chrome, which is why this is a route group.
 */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
