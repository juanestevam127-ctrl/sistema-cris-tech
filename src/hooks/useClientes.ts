"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { CrisTechCliente } from "@/types";

export function useClientes(busca = "", tipoFiltro = "todos") {
  const [clientes, setClientes] = useState<CrisTechCliente[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("cris_tech_clientes").select("*").order("nome");
    if (busca) {
      q = q.or(
        `nome.ilike.%${busca}%,cpf_cnpj.ilike.%${busca}%,telefone.ilike.%${busca}%,celular.ilike.%${busca}%,email.ilike.%${busca}%`
      );
    }
    if (tipoFiltro === "pessoa_fisica") {
      q = q.eq("tipo", "pessoa_fisica");
    } else if (tipoFiltro === "pessoa_juridica") {
      q = q.eq("tipo", "pessoa_juridica");
    }
    const { data } = await q;
    setClientes((data as CrisTechCliente[]) ?? []);
    setLoading(false);
  }, [busca, tipoFiltro]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  return { clientes, loading, refetch: fetchClientes };
}
