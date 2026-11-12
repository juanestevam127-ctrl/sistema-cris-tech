"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CrisTechUsuario } from "@/types";

interface AuthContextType {
  user: { id: string; email: string } | null;
  usuario: CrisTechUsuario | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  usuario: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<CrisTechUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUsuario({
            id: data.user.id,
            email: data.user.email,
            nome: data.user.nome || data.user.email,
            role: data.user.role || "admin",
            created_at: new Date().toISOString(),
          } as CrisTechUsuario);
        } else {
          setUsuario(null);
        }
      } else {
        setUsuario(null);
      }
    } catch (err) {
      console.error("Erro ao verificar sessão:", err);
      setUsuario(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const signOut = async () => {
    try {
      setLoading(true);
      await fetch("/api/auth/logout", { method: "POST" });
      setUsuario(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Erro ao deslogar:", err);
    } finally {
      setLoading(false);
    }
  };

  const user = usuario ? { id: usuario.id, email: usuario.email } : null;

  return (
    <AuthContext.Provider value={{ user, usuario, loading, signOut, refreshUser: fetchSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export const useAuthContext = () => useContext(AuthContext);
