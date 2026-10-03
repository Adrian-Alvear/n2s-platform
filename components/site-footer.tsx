import { SITE } from "@/lib/site";
import { PortalLink } from "./portal-link";

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-5xl px-6 pt-24 pb-12">
      <div aria-hidden className="h-px w-full bg-rule" />
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4 font-mono text-xs text-muted">
        <p className="flex items-center gap-3">
          {SITE.name}
          {/* The operator's door into the ecosystem. Deliberately unlabelled
              on the page; Cloudflare Access guards what is behind it. */}
          <PortalLink
            href="/hub"
            aria-label="Ecosystem"
            title="Ecosystem"
            className="inline-flex h-4 w-4 items-center justify-center opacity-40 transition-opacity hover:opacity-100"
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M17 6.5A8 8 0 1 0 20 12" />
              <path d="M5.5 18.5 19 5" />
            </svg>
          </PortalLink>
        </p>
        <a
          href={`mailto:${SITE.email}`}
          className="n2s-link hover:text-foreground"
        >
          {SITE.email}
        </a>
      </div>
    </footer>
  );
}
