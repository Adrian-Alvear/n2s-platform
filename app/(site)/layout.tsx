import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * The public face (docs/BUILD-PROMPT.md §2.1).
 * The hub has no site chrome, which is why this is a route group.
 */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // relative z-0 makes this wrapper the stacking context the scroll film sits
  // behind (at -z-10). It must never get a background of its own, or the film
  // paints underneath it and disappears.
  return (
    <div className="relative z-0 flex min-h-dvh flex-col">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
