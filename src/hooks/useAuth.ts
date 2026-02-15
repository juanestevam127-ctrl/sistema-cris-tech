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
      const { data, error } = await supabase
        .from("cris_tech_usuarios")
        .select("*")
        .eq("id", userId)
        .single();
      if (error || !data) return null;
      return data as CrisTechUsuario;
    };

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const u = await fetchUsuario(session.user.id);
        setUsuario(u ?? null);
      } else {
        setUser(null);
        setUsuario(null);
      }
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          const u = await fetchUsuario(session.user.id);
          setUsuario(u ?? null);
        } else {
          setUser(null);
          setUsuario(null);
        }
        setLoading(false);
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
