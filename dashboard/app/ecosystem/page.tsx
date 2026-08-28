"use client";

import dynamic from "next/dynamic";

// WebGL has no SSR path, so the canvas is client-only. `ssr: false` is only
// legal inside a Client Component, which is why this page opts in.
const EcosystemCanvas = dynamic(() => import("@/components/ecosystem/EcosystemCanvas"), {
  ssr: false,
});

export default function EcosystemPage() {
  return <EcosystemCanvas />;
}
