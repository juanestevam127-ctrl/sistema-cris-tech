"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { CrisTechUsuario } from "@/types";

interface AuthContextType {
    user: User | null;
    usuario: CrisTechUsuario | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    usuario: null,
    loading: true,
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [usuario, setUsuario] = useState<CrisTechUsuario | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchUsuario = async (userId: string, userEmail: string): Promise<CrisTechUsuario | null> => {
        try {
            // Usar API server-side para buscar perfil (bypassa RLS)
            const response = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: userEmail, authId: userId })
            });

            if (!response.ok) {
                console.error("Erro ao verificar usuário via API");
                return null;
            }

            const data = await response.json();
            return data.usuario as CrisTechUsuario;
        } catch (err) {
            console.error("Exceção ao buscar dados do usuário:", err);
            return null;
        }
    };

    useEffect(() => {
        const initialize = async () => {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();

                if (authUser && authUser.email) {
                    setUser(authUser);
                    const uData = await fetchUsuario(authUser.id, authUser.email);
                    setUsuario(uData);
                } else {
                    setUser(null);
                    setUsuario(null);
                }
            } catch (err) {
                console.error("Erro na inicialização de autenticação:", err);
            } finally {
                setLoading(false);
            }
        };

        initialize();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session?.user && session.user.email) {
                    setUser(session.user);
                    const uData = await fetchUsuario(session.user.id, session.user.email);
                    setUsuario(uData);
                } else {
                    setUser(null);
                    setUsuario(null);
                }
                setLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        try {
            setLoading(true);
            await supabase.auth.signOut();
            setUser(null);
            setUsuario(null);
            router.push("/login");
            router.refresh();
        } catch (err) {
            console.error("Erro ao sair:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, usuario, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuthContext = () => useContext(AuthContext);
