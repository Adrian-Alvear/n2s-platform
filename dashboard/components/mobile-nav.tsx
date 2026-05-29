"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { LayoutDashboard, Wallet, MessageSquare, Shield } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useUser();

  const nav = [
    { href: "/", label: "Home", icon: LayoutDashboard, match: (p: string) => p === "/" },
    { href: "/budget", label: "Budget", icon: Wallet, match: (p: string) => p.startsWith("/budget") },
    { href: "/chat", label: "Chat", icon: MessageSquare, match: (p: string) => p === "/chat" },
    ...(user?.role === "admin"
      ? [{ href: "/admin", label: "Admin", icon: Shield, match: (p: string) => p.startsWith("/admin") }]
      : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex">
        {nav.map(({ href, label, icon: Icon, match }) => (
          <Link key={href} href={href} className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
            match(pathname) ? "text-violet-600" : "text-muted-foreground"
          }`}>
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
