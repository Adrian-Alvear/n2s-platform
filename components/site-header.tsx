import Link from "next/link";
import { SITE } from "@/lib/site";
import { HeaderMark } from "./header-mark";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-baseline justify-between px-6 py-8">
      <HeaderMark>{SITE.name}</HeaderMark>
      <nav className="flex gap-6 font-mono text-xs tracking-wide text-muted uppercase">
        <Link href="/lab" className="n2s-link hover:text-foreground">
          Lab
        </Link>
        <Link href="/studio" className="n2s-link hover:text-foreground">
          Studio
        </Link>
        <Link href="/contact" className="n2s-link hover:text-foreground">
          Contact
        </Link>
      </nav>
    </header>
  );
}
