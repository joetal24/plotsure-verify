import React, { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "Land Buyer" | "Land Agent" | "Bank Loan Officer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: UserRole) => boolean;
  register: (name: string, email: string, password: string, role: UserRole) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, _password: string, role: UserRole) => {
    setUser({
      id: crypto.randomUUID(),
      name: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      email,
      role,
    });
    return true;
  };

  const register = (name: string, email: string, _password: string, role: UserRole) => {
    setUser({ id: crypto.randomUUID(), name, email, role });
    return true;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
