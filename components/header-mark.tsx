"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { portalTo } from "./portal-link";

/**
 * The N2S wordmark. An ordinary link home — and, held with Shift, the
 * operator's door into the ecosystem. Discreet on purpose: the hub is never
 * advertised to clients (BUILD-PROMPT §0). Cloudflare Access is the real lock.
 */
export function HeaderMark({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <Link
      href="/"
      onClick={(e) => {
        if (!e.shiftKey) return;
        e.preventDefault();
        portalTo(router, "/hub");
      }}
      className="font-mono text-xs tracking-[0.2em] uppercase transition-opacity hover:opacity-70"
    >
      {children}
    </Link>
  );
}
