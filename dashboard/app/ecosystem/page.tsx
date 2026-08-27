"use client";

import dynamic from "next/dynamic";

// WebGL has no SSR path, so the canvas is client-only. `ssr: false` is only
// permitted inside a Client Component in the App Router, hence "use client".
const EcosystemCanvas = dynamic(() => import("@/components/ecosystem/EcosystemCanvas"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-black" />,
});

export default function EcosystemPage() {
  return <EcosystemCanvas />;
}
