import { notFound } from "next/navigation";
import { DEMOS_ENABLED } from "@/lib/demos";

/**
 * Demos have no site chrome — they are full-viewport compositions.
 * The whole group 404s in production (see lib/demos.ts).
 */
export default function DemoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!DEMOS_ENABLED) notFound();
  // No background here: a demo may place a fixed media layer beneath its
  // content, and an opaque ancestor background would hide it.
  return <div className="text-white">{children}</div>;
}
