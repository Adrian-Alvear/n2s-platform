import Link from "next/link";
import { cn } from "@/lib/utils";

/** The house control: liquid glass pill. Used sparingly — controls only. */
export function GlassLink({
  href,
  children,
  className,
  external,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
}) {
  const classes = cn(
    "liquid-glass inline-block rounded-full px-8 py-3.5 text-sm",
    className,
  );

  if (external) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
