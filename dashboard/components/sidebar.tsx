"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { LayoutDashboard, Receipt, Settings, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/spending", label: "Gastos", icon: Receipt },
  { href: "/settings", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-sidebar h-screen sticky top-0 flex flex-col">
      <div className="px-6 py-5 border-b border-border">
        <span className="font-semibold text-sm tracking-tight">N2S Family</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              pathname === href
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
            }`}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          {theme === "dark" ? "Modo claro" : "Modo oscuro"}
        </Button>
      </div>
    </aside>
  );
}
