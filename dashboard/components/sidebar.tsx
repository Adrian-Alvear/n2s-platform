"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { useUser } from "@/lib/user-context";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Wallet, MessageSquare, Newspaper, Shield,
  Sun, Moon, ChevronLeft, ChevronRight, Menu,
  Receipt, Settings, ChevronDown, ChevronUp,
} from "lucide-react";

const budgetSub = [
  { href: "/budget", label: "Overview", icon: LayoutDashboard },
  { href: "/budget/spending", label: "Gastos", icon: Receipt },
  { href: "/budget/settings", label: "Config", icon: Settings },
];

function NavItem({ href, label, icon: Icon, collapsed, onClick, active }: {
  href: string; label: string; icon: React.ElementType;
  collapsed?: boolean; onClick?: () => void; active: boolean;
}) {
  return (
    <Link href={href} onClick={onClick} title={collapsed ? label : undefined}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${collapsed ? "justify-center px-2" : ""} ${
        active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
      }`}>
      <Icon size={15} className="shrink-0" />
      {!collapsed && label}
    </Link>
  );
}

function NavContent({ collapsed, pathname, onClose, isAdmin }: {
  collapsed?: boolean; pathname: string; onClose?: () => void; isAdmin: boolean;
}) {
  const isBudget = pathname.startsWith("/budget");
  const [budgetOpen, setBudgetOpen] = useState(isBudget);

  useEffect(() => { if (isBudget) setBudgetOpen(true); }, [isBudget]);

  return (
    <div className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
      <NavItem href="/" label="Dashboard" icon={LayoutDashboard} collapsed={collapsed} onClick={onClose} active={pathname === "/"} />

      {/* Budget group */}
      <div>
        <button
          onClick={() => setBudgetOpen(!budgetOpen)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${collapsed ? "justify-center px-2" : "justify-between"} ${
            isBudget ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          }`}
          title={collapsed ? "Budget" : undefined}
        >
          <div className="flex items-center gap-3">
            <Wallet size={15} className="shrink-0" />
            {!collapsed && "Budget"}
          </div>
          {!collapsed && (budgetOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
        </button>
        {budgetOpen && !collapsed && (
          <div className="ml-3 pl-3 border-l border-border mt-0.5 space-y-0.5">
            {budgetSub.map((s) => (
              <NavItem key={s.href} href={s.href} label={s.label} icon={s.icon} onClick={onClose} active={pathname === s.href} />
            ))}
          </div>
        )}
      </div>

      <NavItem href="/chat" label="Chat" icon={MessageSquare} collapsed={collapsed} onClick={onClose} active={pathname === "/chat"} />
      <NavItem href="/news" label="News" icon={Newspaper} collapsed={collapsed} onClick={onClose} active={pathname === "/news"} />

      {isAdmin && (
        <NavItem href="/admin" label="Admin" icon={Shield} collapsed={collapsed} onClick={onClose} active={pathname.startsWith("/admin")} />
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const isAdmin = user?.role === "admin";
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
        <span className="font-semibold text-sm tracking-tight">N2S</span>
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
            <span className="font-semibold text-sm tracking-tight">N2S Platform</span>
          </div>
          <NavContent pathname={pathname} onClose={() => setMobileOpen(false)} isAdmin={isAdmin} />
          <div className="px-4 py-4 border-t border-border space-y-1">
            {user && <p className="text-xs text-muted-foreground px-3 truncate">{user.name} · {user.role}</p>}
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex shrink-0 border-r border-border bg-sidebar h-screen sticky top-0 flex-col transition-all duration-200 ${collapsed ? "w-14" : "w-56"}`}>
        <div className={`border-b border-border flex items-center ${collapsed ? "justify-center py-4" : "px-5 py-4 justify-between"}`}>
          {!collapsed && <span className="font-semibold text-sm tracking-tight">N2S Platform</span>}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0" onClick={toggleCollapsed}>
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </Button>
        </div>
        <NavContent collapsed={collapsed} pathname={pathname} isAdmin={isAdmin} />
        <div className="px-2 py-3 border-t border-border">
          {!collapsed && user && (
            <div className="px-3 py-1 mb-1">
              <p className="text-xs font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
          )}
          {collapsed ? (
            <Button variant="ghost" size="icon" className="w-full h-9 text-muted-foreground" title={theme === "dark" ? "Light mode" : "Dark mode"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}
