"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useEcosystem } from "./store";
import { nodeForPath } from "./routes";
import { ModuleFrame } from "./ModuleFrame";

// WebGL has no SSR path. Mounted once here and never unmounted, so the context
// survives navigation and the world stays continuous between modules.
const EcosystemCanvas = dynamic(() => import("./EcosystemCanvas"), { ssr: false });

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const setRouteNode = useEcosystem((s) => s.setRouteNode);
  const node = nodeForPath(pathname);

  // The URL is the source of truth; the store mirrors it for the 3D layer.
  useEffect(() => {
    setRouteNode(node);
  }, [node, setRouteNode]);

  return (
    <>
      <EcosystemCanvas />
      {node && <ModuleFrame node={node} onExit={() => router.push("/")}>{children}</ModuleFrame>}
    </>
  );
}
