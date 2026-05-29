"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Settings } from "lucide-react";

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/spending", label: "Gastos", icon: Receipt },
  { href: "/settings", label: "Config", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
            pathname === href ? "text-violet-600" : "text-muted-foreground"
          }`}>
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
