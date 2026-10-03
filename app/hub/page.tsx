import { headers } from "next/headers";
import { identityFromHeaders } from "@/lib/auth";
import { HubWorld } from "@/components/hub-world";
import { PortalLink } from "@/components/portal-link";

/**
 * The back face — the assistant's ecosystem (docs/BUILD-PROMPT.md §2.2).
 *
 * The orrery lives HERE and only here. It is the operator's shell, not the
 * studio's decoration; a client never sees it.
 */
export default async function Hub() {
  const identity = identityFromHeaders(await headers());

  return (
    <div className="relative min-h-dvh">
      <HubWorld />

      {/* Chrome sits above the world but only where it is drawn, so the rest
          of the screen stays free to drag and zoom the orrery. */}
      <header className="pointer-events-none relative z-10 mx-auto flex w-full max-w-6xl items-baseline justify-between px-6 py-8">
        <PortalLink
          href="/"
          className="pointer-events-auto font-mono text-xs tracking-[0.2em] text-muted uppercase transition-colors hover:text-foreground"
        >
          ← N2S Studio
        </PortalLink>
        <p className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
          Ecosystem
        </p>
      </header>

      <main className="pointer-events-none relative z-10 mx-auto max-w-6xl px-6">
        <h1 className="font-display mt-6 text-3xl">
          {identity ? `Welcome back, ${identity.name}.` : "Not signed in"}
        </h1>
        <p className="mt-3 max-w-sm text-sm text-muted">
          Drag to orbit, scroll to zoom. Nodes become doors in Phase 3.
        </p>
      </main>
    </div>
  );
}
