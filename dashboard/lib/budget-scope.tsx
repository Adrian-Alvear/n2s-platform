"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@/lib/user-context";

// Which budget the user is viewing: the shared family budget, or Adrian's
// personal one. Persisted so it stays put across navigation/reloads.
export type BudgetScope = "family" | "personal";

const Ctx = createContext<{ scope: BudgetScope; setScope: (s: BudgetScope) => void }>({
  scope: "family",
  setScope: () => {},
});

export function BudgetScopeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [scope, setScopeState] = useState<BudgetScope>("family");

  useEffect(() => {
    const saved = localStorage.getItem("n2s_budget_scope");
    if (saved === "personal" || saved === "family") {
      setScopeState(saved);
      return;
    }
    // No saved choice yet — default to Personal for Adrian, Family for everyone else
    if ((user?.name ?? "").toLowerCase().startsWith("adrian")) setScopeState("personal");
  }, [user]);

  function setScope(s: BudgetScope) {
    setScopeState(s);
    localStorage.setItem("n2s_budget_scope", s);
  }

  return <Ctx.Provider value={{ scope, setScope }}>{children}</Ctx.Provider>;
}

export function useBudgetScope() {
  return useContext(Ctx);
}
