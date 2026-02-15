"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLayouts } from "@/hooks/useLayouts";
import { AppLayout } from "@/components/layout/AppLayout";
import { TabelaDinamica } from "@/components/operacao/TabelaDinamica";
import { Button } from "@/components/ui/Button";
import type { CrisTechLayout, LinhaOperacao } from "@/types";

function truncarUrl(url: string, max = 30) {
  if (url.length <= max) return url;
  return url.slice(0, Math.floor(max / 2)) + "..." + url.slice(-Math.floor(max / 2));
}

export default function OperacaoPage() {
  const { usuario, loading: authLoading } = useAuth();
  const { layouts, loading: layoutsLoading } = useLayouts();
  const [layoutSelecionado, setLayoutSelecionado] = useState<CrisTechLayout | null>(null);
  const [linhas, setLinhas] = useState<LinhaOperacao[]>([]);
  const [enviando, setEnviando] = useState(false);

  const adicionarLinha = useCallback(() => {
    const campos = layoutSelecionado?.campos ?? [];
    const dados: Record<string, string | string[]> = {};
    campos.forEach((c) => {
      if (c.tipo === "checkbox") {
        dados[c.nome] = [];
      } else if (c.tipo === "imagem") {
        dados[c.nome] = "";
      } else {
        dados[c.nome] = "";
      }
    });
    setLinhas((prev) => [...prev, { id: crypto.randomUUID(), dados }]);
  }, [layoutSelecionado]);

  const aoSelecionarLayout = useCallback((layout: CrisTechLayout | null) => {
    setLayoutSelecionado(layout);
    if (layout?.campos?.length) {
      const dados: Record<string, string | string[]> = {};
      layout.campos.forEach((c) => {
        if (c.tipo === "checkbox") dados[c.nome] = [];
        else if (c.tipo === "imagem") dados[c.nome] = "";
        else dados[c.nome] = "";
      });
      setLinhas([{ id: crypto.randomUUID(), dados }]);
    } else {
      setLinhas([]);
    }
  }, []);

  const handleGerarImagens = async () => {
    if (!layoutSelecionado || linhas.length === 0) return;
    setEnviando(true);
    try {
      const body = {
        layout: layoutSelecionado.nome,
        itens: linhas.map((l) => l.dados),
      };
      const res = await fetch(layoutSelecionado.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const toast = (await import("react-hot-toast")).default;
        toast.success("Imagens enviadas com sucesso!");
      } else {
        throw new Error("Erro ao enviar");
      }
    } catch {
      const toast = (await import("react-hot-toast")).default;
      toast.error("Erro ao enviar.");
    } finally {
      setEnviando(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CC0000] border-t-transparent" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Gerenciamento de Imagens
          </h1>
          <p className="text-[#9CA3AF]">
            Automação e gestão completa de imagens.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={layoutSelecionado?.id ?? ""}
              onChange={(e) => {
                const l = layouts.find((x) => x.id === e.target.value) ?? null;
                aoSelecionarLayout(l);
              }}
              className="rounded-lg border border-[#1E1E1E] bg-[#111111] px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
            >
              <option value="">Selecione um layout</option>
              {layouts.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
            {layoutSelecionado?.webhook_url && (
              <span className="text-sm text-[#9CA3AF]">
                Webhook Ativo: {truncarUrl(layoutSelecionado.webhook_url, 40)}
              </span>
            )}
          </div>
          <Button
            variant="primary"
            onClick={handleGerarImagens}
            loading={enviando}
            disabled={!layoutSelecionado || linhas.length === 0}
          >
            Gerar Imagens
          </Button>
        </div>

        {layoutSelecionado && (
          <TabelaDinamica
            layout={layoutSelecionado}
            linhas={linhas}
            setLinhas={setLinhas}
            adicionarLinha={adicionarLinha}
          />
        )}
      </div>
    </AppLayout>
  );
}
