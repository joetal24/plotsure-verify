import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { registerLocalUser, loginViaBackend } from "@/lib/api";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export type UserRole = "land_buyer" | "land_seller" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (name: string, email: string, password: string, role: UserRole, roles?: UserRole[]) => Promise<{ error: string | null; authenticated: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

function mapUser(supaUser: SupabaseUser): User {
  const meta = supaUser.user_metadata || {};
  const roles: UserRole[] = meta.roles || (meta.role ? [meta.role] : ["land_buyer"]);
  return {
    id: supaUser.id,
    name: meta.name || meta.full_name || supaUser.email?.split("@")[0] || "",
    email: supaUser.email || "",
    role: roles[0] || "land_buyer",
    roles: roles,
  };
}

function decodeJwtUser(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const meta = payload.user_metadata || {};
    const roles: UserRole[] = meta.roles || (meta.role ? [meta.role] : ["land_buyer"]);
    return {
      id: payload.sub,
      email: payload.email || "",
      name: meta.name || meta.full_name || payload.email?.split("@")[0] || "",
      role: roles[0] || "land_buyer",
      roles: roles,
    };
  } catch {
    return null;
  }
}

function setStoredTokens(accessToken: string, refreshToken: string) {
  try {
    localStorage.setItem(
      "sb-asrdbshuymixmqegfmnf-auth-token",
      JSON.stringify({ access_token: accessToken, refresh_token: refreshToken })
    );
  } catch {
    // localStorage may not be available
  }
}

function clearStoredTokens() {
  try {
    localStorage.removeItem("sb-asrdbshuymixmqegfmnf-auth-token");
  } catch {
    // localStorage may not be available
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(mapUser(session.user));
      setLoading(false);
      return;
    }
    // Try to restore from local JWT if Supabase session unavailable
    try {
      const raw = localStorage.getItem("sb-asrdbshuymixmqegfmnf-auth-token");
      if (raw) {
        const { access_token } = JSON.parse(raw);
        const parsed = decodeJwtUser(access_token);
        if (parsed && parsed.id) {
          try {
            const { data } = await supabase.auth.setSession({ access_token, refresh_token: "" });
            if (data?.user) {
              setUser(mapUser(data.user));
              setLoading(false);
              return;
            }
          } catch {
            setUser(parsed);
          }
        }
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }

  const login = async (email: string, password: string) => {
    try {
      const result = await loginViaBackend({ email, password });
      setStoredTokens(result.access_token, result.refresh_token);
      // Set user from JWT immediately so React state is queued
      // before navigate() is called by the login page — prevents
      // Dashboard from mounting with null user and redirecting to /login
      const parsed = decodeJwtUser(result.access_token);
      if (parsed) setUser(parsed);
      // Then try to set the Supabase session (background — best-effort)
      try {
        await supabase.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        });
      } catch {
        // Supabase unreachable — already set user from JWT above
      }
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Login failed" };
    }
  };

  const register = async (name: string, email: string, password: string, role: UserRole, roles?: UserRole[]) => {
    const userRoles = roles || [role];
    console.log("[register] Starting registration", { name, email, role, userRoles, isDev: import.meta.env.DEV });
    if (import.meta.env.DEV) {
      try {
        console.log("[register] Calling registerLocalUser...");
        const regResult = await registerLocalUser({ name, email, password, role, roles: userRoles });
        console.log("[register] registerLocalUser succeeded", regResult);
        console.log("[register] Logging in via backend...");
        const loginResult = await loginViaBackend({ email, password });
        console.log("[register] Backend login succeeded", { userId: loginResult.user_id });
        setStoredTokens(loginResult.access_token, loginResult.refresh_token);
        try {
          await supabase.auth.setSession({
            access_token: loginResult.access_token,
            refresh_token: loginResult.refresh_token,
          });
        } catch {
          const parsed = decodeJwtUser(loginResult.access_token);
          if (parsed) setUser(parsed);
        }
        return { error: null, authenticated: true };
      } catch (localError) {
        console.warn("[register] registerLocalUser failed, falling back to supabase signUp", localError);
        const fallback = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, role, roles: userRoles },
          },
        });
        console.log("[register] Fallback supabase signUp result", { error: fallback.error, hasSession: !!fallback.data.session });
        if (fallback.error) return { error: fallback.error.message, authenticated: false };
        return { error: null, authenticated: !!fallback.data.session };
      }
    }

    console.log("[register] Production path - calling supabase.auth.signUp");
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
      },
    });
    console.log("[register] supabase signUp result", { error, hasSession: !!data.session });
    if (error) return { error: error.message, authenticated: false };
    return { error: null, authenticated: !!data.session };
  };

  const logout = async () => {
    clearStoredTokens();
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
  };

  const stableUser = useMemo(() => user, [user?.id, user?.email, user?.role]);

  return (
    <AuthContext.Provider value={{ user: stableUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
