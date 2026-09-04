import type { NodeId } from "./store";

/**
 * The ecosystem is the app shell, so the URL — not local state — decides which
 * portal is open. That keeps deep links, browser back and refresh working:
 * /budget/spending lands you inside the Financial Hub rather than on a bare page.
 */
export type ModuleRoute = { prefix: string; node: NodeId | "core" };

export const MODULE_ROUTES: ModuleRoute[] = [
  { prefix: "/overview", node: "core" },
  { prefix: "/budget", node: "financial" },
];

/** The node whose portal a path belongs to, or null for the macro view. */
export function nodeForPath(pathname: string): NodeId | "core" | null {
  const hit = MODULE_ROUTES.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  return hit ? hit.node : null;
}

/** Where diving into a node navigates. Nodes without a module stay in 3D. */
export function pathForNode(node: NodeId | "core"): string | null {
  const hit = MODULE_ROUTES.find((r) => r.node === node);
  return hit ? hit.prefix : null;
}
