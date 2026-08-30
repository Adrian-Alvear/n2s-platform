import { MEMBERS, MEMBER_COLORS, type Member } from "@/lib/data";

/**
 * Circular monogram for a household member — the reference plate's "Fast
 * transfer" avatar row, without photographs we do not have.
 *
 * The disc reuses MEMBER_COLORS so a person reads the same hue here as in the
 * transaction pills, and it is always rendered beside the written name, so the
 * avatar is decoration (aria-hidden) rather than the only way to tell people
 * apart.
 */
export function MemberAvatar({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: "sm" | "md";
  className?: string;
}) {
  // Display names can carry a surname ("Adrian Alvear"); match on the first
  // name the way the scope gate in the budget page does.
  const member: Member | undefined = MEMBERS.find((m) =>
    name.trim().toLowerCase().startsWith(m.toLowerCase())
  );
  const tone = member ? MEMBER_COLORS[member] : "bg-muted text-muted-foreground";
  const box = size === "sm" ? "h-6 w-6 text-[11px]" : "h-8 w-8 text-xs";

  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold uppercase ${box} ${tone} ${className}`}
    >
      {name.trim().charAt(0)}
    </span>
  );
}
