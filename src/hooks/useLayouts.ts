"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { CrisTechLayout, CrisTechCampo } from "@/types";

export function useLayouts() {
  const [layouts, setLayouts] = useState<CrisTechLayout[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLayouts = async () => {
    const { data, error } = await supabase
      .from("cris_tech_layouts")
      .select(`
        *,
        cris_tech_campos (*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar layouts:", error);
      setLayouts([]);
    } else {
      const sorted = (data || []).map((l) => ({
        ...l,
        campos: (l.cris_tech_campos || [])
          .sort((a: CrisTechCampo, b: CrisTechCampo) => a.ordem - b.ordem),
      }));
      setLayouts(sorted as CrisTechLayout[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLayouts();
  }, []);

  return { layouts, loading, refetch: fetchLayouts };
}
