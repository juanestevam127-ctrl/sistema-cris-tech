"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { CrisTechUsuario } from "@/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<CrisTechUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUsuario = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("cris_tech_usuarios")
          .select("*")
          .eq("id", userId)
          .single();
        if (error || !data) {
          console.error("Erro ao buscar usuário na tabela:", error);
          return null;
        }
        return data as CrisTechUsuario;
      } catch (err) {
        console.error("Exceção ao buscar usuário:", err);
        return null;
      }
    };

    const init = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setUser(authUser);
          const u = await fetchUsuario(authUser.id);
          setUsuario(u ?? null);
        } else {
          setUser(null);
          setUsuario(null);
        }
      } catch (err) {
        console.error("Erro na inicialização do Auth:", err);
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (session?.user) {
            setUser(session.user);
            const u = await fetchUsuario(session.user.id);
            setUsuario(u ?? null);
          } else {
            setUser(null);
            setUsuario(null);
          }
        } catch (err) {
          console.error("Erro na mudança de estado do Auth:", err);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return { user, usuario, loading, signOut };
}
