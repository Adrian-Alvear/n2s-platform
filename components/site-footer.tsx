import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-5xl px-6 pt-24 pb-12">
      <div aria-hidden className="h-px w-full bg-rule" />
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4 font-mono text-xs text-muted">
        <p>{SITE.name}</p>
        <a
          href={`mailto:${SITE.email}`}
          className="transition-colors hover:text-foreground"
        >
          {SITE.email}
        </a>
      </div>
    </footer>
  );
}
