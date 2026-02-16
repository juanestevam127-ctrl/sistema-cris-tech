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

    const fetchUsuario = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from("cris_tech_usuarios")
                .select("*")
                .eq("id", userId)
                .single();

            if (error) {
                console.error("Erro ao buscar dados do usuário:", error);
                return null;
            }
            return data as CrisTechUsuario;
        } catch (err) {
            console.error("Exceção ao buscar dados do usuário:", err);
            return null;
        }
    };

    useEffect(() => {
        const initialize = async () => {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();

                if (authUser) {
                    setUser(authUser);
                    const uData = await fetchUsuario(authUser.id);
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
                if (session?.user) {
                    setUser(session.user);
                    const uData = await fetchUsuario(session.user.id);
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
