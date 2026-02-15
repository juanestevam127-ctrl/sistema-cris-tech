"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import type { CrisTechOS, CrisTechCliente, CrisTechOSFoto } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  aberta: "bg-[#3B82F6]",
  em_andamento: "bg-[#F59E0B]",
  aguardando_pecas: "bg-[#F97316]",
  concluida: "bg-[#22C55E]",
  cancelada: "bg-[#6B7280]",
};

export default function OSPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [os, setOs] = useState<(CrisTechOS & { cliente?: CrisTechCliente; tecnico?: { nome: string }; fotos?: CrisTechOSFoto[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [fotoModal, setFotoModal] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: osData } = await supabase
        .from("cris_tech_ordens_servico")
        .select("*, cris_tech_clientes(*), cris_tech_usuarios!tecnico_responsavel(nome)")
        .eq("id", id)
        .single();
      const { data: fotos } = await supabase
        .from("cris_tech_os_fotos")
        .select("*")
        .eq("os_id", id);
      const o = osData as CrisTechOS & { cris_tech_clientes?: CrisTechCliente; cris_tech_usuarios?: { nome: string } };
      if (o) {
        setOs({
          ...o,
          cliente: o.cris_tech_clientes,
          tecnico: o.cris_tech_usuarios,
          fotos: (fotos ?? []) as CrisTechOSFoto[],
        });
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const garantiaStatus = () => {
    if (!os?.data_vencimento_garantia || os.status !== "concluida")
      return null;
    const venc = new Date(os.data_vencimento_garantia);
    const hoje = new Date();
    const diff = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: "Garantia expirada", color: "text-red-400" };
    if (diff <= 30) return { text: `Expira em ${diff} dias`, color: "text-amber-400" };
    return { text: "Na garantia", color: "text-green-400" };
  };

  if (loading || !os) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CC0000] border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  const gStatus = garantiaStatus();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              OS-{String(os.numero_os).padStart(4, "0")}
            </h1>
            <span
              className={`mt-1 inline-block rounded px-2 py-0.5 text-sm ${
                STATUS_COLORS[os.status] ?? "bg-[#1E1E1E]"
              }`}
            >
              {os.status.replace("_", " ")}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push(`/ordens-de-servico/${id}/editar`)}
            >
              Editar
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-6">
            <h2 className="mb-4 font-semibold text-white">Informações Gerais</h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-[#9CA3AF]">Cliente: </span>
                <button
                  type="button"
                  onClick={() => os.cliente && router.push(`/clientes/${os.cliente.id}`)}
                  className="text-[#CC0000] hover:underline"
                >
                  {os.cliente?.nome ?? "—"}
                </button>
              </p>
              <p className="text-[#9CA3AF]">
                Tipo: {os.tipo.replace("_", " ")}
              </p>
              <p className="text-[#9CA3AF]">
                Data abertura: {formatDate(os.data_abertura)}
              </p>
              <p className="text-[#9CA3AF]">
                Data conclusão: {formatDate(os.data_conclusao) || "—"}
              </p>
              <p className="text-[#9CA3AF]">
                Técnico: {(os.tecnico as { nome?: string })?.nome ?? "—"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-6">
            <h2 className="mb-4 font-semibold text-white">Problema & Serviço</h2>
            <div className="space-y-3 text-sm">
              <p className="text-[#9CA3AF]">
                <span className="font-medium text-white">Problema relatado:</span>
                <br />
                {os.descricao_problema || "—"}
              </p>
              <p className="text-[#9CA3AF]">
                <span className="font-medium text-white">O que foi feito:</span>
                <br />
                {os.servicos_realizados || "—"}
              </p>
              <p className="text-[#9CA3AF]">
                <span className="font-medium text-white">Peças utilizadas:</span>
                <br />
                {os.pecas_utilizadas || "—"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-6">
            <h2 className="mb-4 font-semibold text-white">Valores</h2>
            <div className="space-y-2 text-sm">
              <p className="flex justify-between text-[#9CA3AF]">
                Serviço: <span>{formatCurrency(os.valor_servico ?? 0)}</span>
              </p>
              <p className="flex justify-between text-[#9CA3AF]">
                Peças: <span>{formatCurrency(os.valor_pecas ?? 0)}</span>
              </p>
              <p className="flex justify-between border-t border-[#1E1E1E] pt-2 text-lg font-bold text-white">
                Total: <span>{formatCurrency(os.valor_total ?? 0)}</span>
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-6">
            <h2 className="mb-4 font-semibold text-white">Garantia</h2>
            <div className="space-y-2 text-sm">
              <p className="text-[#9CA3AF]">
                Duração: {os.garantia_meses ? `${os.garantia_meses} meses` : "Sem garantia"}
              </p>
              <p className="text-[#9CA3AF]">
                Vencimento: {formatDate(os.data_vencimento_garantia) || "—"}
              </p>
              {gStatus && (
                <p className={gStatus.color}>{gStatus.text}</p>
              )}
            </div>
          </div>
        </div>

        {os.fotos && os.fotos.length > 0 && (
          <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-6">
            <h2 className="mb-4 font-semibold text-white">Fotos</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {os.fotos.map((f) => (
                <div
                  key={f.id}
                  className="cursor-pointer overflow-hidden rounded-lg border border-[#1E1E1E]"
                  onClick={() => setFotoModal(f.url)}
                >
                  <img
                    src={f.url}
                    alt={f.descricao || ""}
                    className="h-[120px] w-full object-cover"
                  />
                  <p className="truncate bg-[#0A0A0A] px-2 py-1 text-xs text-[#9CA3AF]">
                    {f.tipo} — {f.descricao || "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {os.observacoes && (
          <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-6">
            <h2 className="mb-2 font-semibold text-white">Observações internas</h2>
            <p className="text-sm text-[#9CA3AF]">{os.observacoes}</p>
          </div>
        )}
      </div>

      {fotoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setFotoModal(null)}
        >
          <img
            src={fotoModal}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </AppLayout>
  );
}
