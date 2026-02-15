"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { CrisTechUsuario } from "@/types";

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<CrisTechUsuario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("cris_tech_usuarios")
        .select("*")
        .order("nome");
      setUsuarios((data as CrisTechUsuario[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  return { usuarios, loading };
}
