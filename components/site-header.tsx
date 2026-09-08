import Link from "next/link";
import { SITE } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-baseline justify-between px-6 py-8">
      <Link
        href="/"
        className="font-mono text-xs tracking-[0.2em] uppercase transition-opacity hover:opacity-70"
      >
        {SITE.name}
      </Link>
      <nav className="flex gap-6 font-mono text-xs tracking-wide text-muted uppercase">
        <Link href="/lab" className="transition-colors hover:text-foreground">
          Lab
        </Link>
        <Link href="/studio" className="transition-colors hover:text-foreground">
          Studio
        </Link>
        <Link href="/contact" className="transition-colors hover:text-foreground">
          Contact
        </Link>
      </nav>
    </header>
  );
}
