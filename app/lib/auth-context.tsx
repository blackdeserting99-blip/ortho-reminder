"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AuthUser = {
  id: string;
  name: string | null;
  email: string;
  whatsappPhone: string | null;
};

type AuthState = {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
};

const AuthContext = createContext<AuthState>({ user: null, status: "loading" });

// Fetches the current user once per app load and shares it, instead of every
// component (Navbar, Sidebar, pages) independently requesting /api/me.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, status: "loading" });

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      try {
        const response = await fetch("/api/me", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (cancelled) return;

        if (response.ok) {
          const data = await response.json().catch(() => null);
          if (data && typeof data === "object") {
            setState({ user: data as AuthUser, status: "authenticated" });
            return;
          }
        }

        if (response.status === 401) {
          setState((prev) => ({ user: prev.user ?? null, status: prev.user ? "authenticated" : "unauthenticated" }));
          return;
        }

        setState((prev) => ({ ...prev, status: prev.user ? "authenticated" : "unauthenticated" }));
      } catch {
        if (!cancelled) {
          setState((prev) => ({ ...prev, status: prev.user ? "authenticated" : "unauthenticated" }));
        }
      }
    };

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => state, [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
