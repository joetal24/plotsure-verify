import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { registerLocalUser } from "@/lib/api";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(mapUser(session.user));
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapUser(session.user));
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const register = async (name: string, email: string, password: string, role: UserRole, roles?: UserRole[]) => {
    const userRoles = roles || [role];
    if (import.meta.env.DEV) {
      try {
        await registerLocalUser({ name, email, password, role, roles: userRoles });
        const loginResult = await login(email, password);
        if (loginResult.error) {
          return { error: loginResult.error, authenticated: false };
        }
        return { error: null, authenticated: true };
      } catch (localError) {
        const fallback = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, role, roles: userRoles },
          },
        });
        if (fallback.error) return { error: fallback.error.message, authenticated: false };
        return { error: null, authenticated: !!fallback.data.session };
      }
    }

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
      },
    });
    if (error) return { error: error.message, authenticated: false };
    return { error: null, authenticated: !!data.session };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
