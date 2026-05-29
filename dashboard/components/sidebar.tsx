"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { LayoutDashboard, Receipt, Settings, Sun, Moon, ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/spending", label: "Gastos", icon: Receipt },
  { href: "/settings", label: "Configuración", icon: Settings },
];

function NavLinks({ pathname, collapsed, onClick }: { pathname: string; collapsed?: boolean; onClick?: () => void }) {
  return (
    <>
      {nav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onClick}
          title={collapsed ? label : undefined}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
            collapsed ? "justify-center px-2" : ""
          } ${
            pathname === href
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          }`}
        >
          <Icon size={15} className="shrink-0" />
          {!collapsed && label}
        </Link>
      ))}
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("n2s-sidebar");
    if (stored === "collapsed") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("n2s-sidebar", next ? "collapsed" : "open");
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-12 bg-background border-b border-border flex items-center px-4 gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileOpen(true)}>
          <Menu size={18} />
        </Button>
        <span className="font-semibold text-sm tracking-tight">N2S Family</span>
        <div className="ml-auto">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </Button>
        </div>
      </div>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          <div className="px-6 py-5 border-b border-border">
            <span className="font-semibold text-sm tracking-tight">N2S Family</span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            <NavLinks pathname={pathname} onClick={() => setMobileOpen(false)} />
          </nav>
          <div className="px-4 py-4 border-t border-border">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              {theme === "dark" ? "Modo claro" : "Modo oscuro"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex shrink-0 border-r border-border bg-sidebar h-screen sticky top-0 flex-col transition-all duration-200 ${collapsed ? "w-14" : "w-56"}`}>
        <div className={`border-b border-border flex items-center ${collapsed ? "justify-center py-4" : "px-6 py-5 justify-between"}`}>
          {!collapsed && <span className="font-semibold text-sm tracking-tight">N2S Family</span>}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0" onClick={toggleCollapsed}>
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </Button>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          <NavLinks pathname={pathname} collapsed={collapsed} />
        </nav>
        <div className="px-2 py-4 border-t border-border">
          {collapsed ? (
            <Button variant="ghost" size="icon" className="w-full h-9 text-muted-foreground" title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              {theme === "dark" ? "Modo claro" : "Modo oscuro"}
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}
