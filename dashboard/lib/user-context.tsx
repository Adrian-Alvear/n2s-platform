"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type UserRole = "admin" | "member" | "viewer";
export type User = { email: string; name: string; role: UserRole };

const UserContext = createContext<{ user: User | null; loading: boolean }>({
  user: null,
  loading: true,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => { setUser(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return <UserContext.Provider value={{ user, loading }}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
