import { cn } from "@/lib/utils";

/**
 * A generated visual for the page's media slots.
 *
 * The reference design fills these with hosted video. These are drifting
 * gradient fields instead — ours, no request, no decode, and tintable with the
 * palette. `seed` offsets the animation phase so two plates on one page never
 * move in lockstep.
 */
export function MotionPlate({
  seed = "a",
  className,
  children,
}: {
  seed?: "a" | "b" | "c";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "n2s-plate",
        seed === "b" && "n2s-plate--b",
        seed === "c" && "n2s-plate--c",
        className,
      )}
    >
      {children}
    </div>
  );
}
