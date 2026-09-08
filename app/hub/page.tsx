import { headers } from "next/headers";
import { identityFromHeaders } from "@/lib/auth";
import { HubWorld } from "@/components/hub-world";

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
      <main className="relative z-10 mx-auto max-w-3xl px-6 py-16">
        <p className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
          Hub
        </p>
        <h1 className="font-display mt-8 text-4xl">
          {identity ? `Signed in as ${identity.name}` : "Not signed in"}
        </h1>
        <p className="mt-4 text-sm text-muted">
          The ecosystem is live. Nodes become doors in Phase 3.
        </p>
      </main>
    </div>
  );
}
