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
  const [state, setState] = useState<AuthState>(() => {
    if (typeof window === "undefined") {
      return { user: null, status: "loading" };
    }

    try {
      const cached = JSON.parse(sessionStorage.getItem("ortho-auth-user") || "null");
      if (cached && typeof cached === "object") {
        return { user: cached as AuthUser, status: "authenticated" };
      }
    } catch {
      // Ignore cached-user issues and continue with the live fetch.
    }

    return { user: null, status: "loading" };
  });

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      try {
        const cachedKey = "ortho-auth-user";
        try {
          const cached = JSON.parse(sessionStorage.getItem(cachedKey) || "null");
          if (cached && typeof cached === "object") {
            setState({ user: cached as AuthUser, status: "authenticated" });
          }
        } catch {
          // Ignore cached-user issues and continue with the live fetch.
        }

        const response = await fetch("/api/me", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (cancelled) return;

        if (response.ok) {
          const data = await response.json().catch(() => null);
          if (data && typeof data === "object") {
            sessionStorage.setItem("ortho-auth-user", JSON.stringify(data));
            setState({ user: data as AuthUser, status: "authenticated" });
            return;
          }
        }

        if (response.status === 401) {
          sessionStorage.removeItem("ortho-auth-user");
          setState({ user: null, status: "unauthenticated" });
          return;
        }

        setState((prev) => ({ user: prev.user ?? null, status: prev.user ? "authenticated" : "unauthenticated" }));
      } catch {
        if (!cancelled) {
          setState((prev) => ({ user: prev.user ?? null, status: prev.user ? "authenticated" : "unauthenticated" }));
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
