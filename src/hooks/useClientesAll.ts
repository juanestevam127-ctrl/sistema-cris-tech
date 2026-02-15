"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { CrisTechCliente } from "@/types";

export function useClientesAll() {
  const [clientes, setClientes] = useState<CrisTechCliente[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClientes = useCallback(async () => {
    const { data } = await supabase
      .from("cris_tech_clientes")
      .select("*")
      .order("nome");
    setClientes((data as CrisTechCliente[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  return { clientes, loading, refetch: fetchClientes };
}
