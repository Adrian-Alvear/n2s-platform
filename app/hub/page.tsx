import { identityFromHeaders } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * The back face (docs/BUILD-PROMPT.md §2.2).
 * Phase 0: proves the gate works. Modules arrive in Phase 3.
 */
export default async function Hub() {
  const identity = identityFromHeaders(await headers());

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
        Hub
      </p>
      <h1 className="font-display mt-8 text-4xl">
        {identity ? `Signed in as ${identity.name}` : "Not signed in"}
      </h1>
      <p className="mt-4 text-sm text-muted">
        Access gate is live. Modules arrive in Phase 3.
      </p>
    </main>
  );
}
