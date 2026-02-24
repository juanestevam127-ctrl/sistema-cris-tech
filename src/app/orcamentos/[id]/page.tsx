"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { ModalConfirmacao } from "@/components/manutencao/ModalConfirmacao";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import type { CrisTechOrcamento, CrisTechCliente, CrisTechOrcamentoItem } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-[#F59E0B]",
  aprovado: "bg-[#22C55E]",
  recusado: "bg-[#CC0000]",
  expirado: "bg-[#6B7280]",
};

export default function OrcamentoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [orcamento, setOrcamento] = useState<(CrisTechOrcamento & { itens?: CrisTechOrcamentoItem[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [convertendo, setConvertendo] = useState(false);
  const [modalConvert, setModalConvert] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: orc } = await supabase
        .from("cris_tech_orcamentos")
        .select("*, cris_tech_clientes(*)")
        .eq("id", id)
        .single();
      const { data: itens } = await supabase
        .from("cris_tech_orcamento_itens")
        .select("*")
        .eq("orcamento_id", id)
        .order("ordem");
      if (orc) {
        const o = orc as CrisTechOrcamento & { cris_tech_clientes?: CrisTechCliente };
        setOrcamento({
          ...o,
          cliente: o.cris_tech_clientes,
          itens: (itens ?? []) as CrisTechOrcamentoItem[],
        } as CrisTechOrcamento & { itens?: CrisTechOrcamentoItem[]; cliente?: CrisTechCliente });
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const totalGeral = orcamento?.itens?.reduce((s, i) => s + (i.valor_total ?? 0), 0) ?? 0;
  const cliente = (orcamento as { cliente?: CrisTechCliente })?.cliente;
  const vencido = orcamento?.status === "pendente" && orcamento?.data_validade && orcamento.data_validade < new Date().toISOString().split("T")[0];

  const converterEmOS = async () => {
    if (!orcamento || !cliente) return;
    setConvertendo(true);
    try {
      const itensTexto = orcamento.itens
        ?.map((i) => `- ${i.descricao} (${i.quantidade} x ${formatCurrency(i.valor_unitario ?? 0)} = ${formatCurrency(i.valor_total ?? 0)})`)
        .join("\n") ?? "";
      const { data: os, error } = await supabase
        .from("cris_tech_ordens_servico")
        .insert({
          cliente_id: orcamento.cliente_id,
          tipo: "manutencao",
          status: "aberta",
          data_abertura: new Date().toISOString().split("T")[0],
          descricao_problema: orcamento.descricao ?? "",
          servicos_realizados: itensTexto,
          valor_servico: totalGeral,
          valor_pecas: 0,
          valor_total: totalGeral,
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase
        .from("cris_tech_orcamentos")
        .update({ status: "aprovado" })
        .eq("id", id);
      toast.success("Orçamento convertido em OS!");
      setModalConvert(false);
      router.push(`/ordens-de-servico/${(os as { id: string }).id}`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao converter.");
    } finally {
      setConvertendo(false);
    }
  };

  if (loading || !orcamento) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CC0000] border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              ORC-{String(orcamento.numero_orcamento).padStart(4, "0")}
            </h1>
            <span className={`mt-1 inline-block rounded px-2 py-0.5 text-sm ${STATUS_COLORS[orcamento.status] ?? "bg-[#1E1E1E]"}`}>
              {orcamento.status}
            </span>
            {orcamento.imagem_orc_status === "concluida" && (
              <span className="ml-2 mt-1 inline-block rounded bg-green-900/40 px-2 py-0.5 text-sm text-green-400">
                Imagem Gerada
              </span>
            )}
            {orcamento.imagem_orc_status === "gerando" && (
              <span className="ml-2 mt-1 inline-block animate-pulse rounded bg-blue-900/40 px-2 py-0.5 text-sm text-blue-400">
                Gerando Imagem...
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push(`/orcamentos/${id}/editar`)}>
              Editar
            </Button>
            {orcamento.status === "pendente" && (
              <Button variant="primary" className="bg-green-600 hover:bg-green-700" onClick={() => setModalConvert(true)}>
                Converter em OS
              </Button>
            )}
          </div>
        </div>

        {vencido && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-900/20 p-4 text-amber-400">
            Este orçamento expirou em {formatDate(orcamento.data_validade)}. Deseja marcá-lo como expirado?
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-6">
            <h2 className="mb-4 font-semibold text-white">Cliente</h2>
            <button
              type="button"
              onClick={() => cliente && router.push(`/clientes/${cliente.id}`)}
              className="text-[#CC0000] hover:underline"
            >
              {cliente?.nome ?? "—"}
            </button>
          </div>
          <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-6">
            <h2 className="mb-4 font-semibold text-white">Informações</h2>
            <div className="space-y-2 text-sm text-[#9CA3AF]">
              <p>Emissão: {formatDate(orcamento.data_emissao)}</p>
              <p>Validade: {formatDate(orcamento.data_validade) || "—"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-6">
          <h2 className="mb-4 font-semibold text-white">Itens</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E1E1E]">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-[#9CA3AF]">#</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-[#9CA3AF]">Descrição</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-[#9CA3AF]">Qtd</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-[#9CA3AF]">Valor Unit.</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-[#9CA3AF]">Total</th>
                </tr>
              </thead>
              <tbody>
                {orcamento.itens?.map((i, idx) => (
                  <tr key={i.id} className="border-b border-[#1E1E1E] last:border-0">
                    <td className="px-4 py-2 text-[#9CA3AF]">{idx + 1}</td>
                    <td className="px-4 py-2 text-white">{i.descricao}</td>
                    <td className="px-4 py-2 text-[#9CA3AF]">{i.quantidade}</td>
                    <td className="px-4 py-2 text-[#9CA3AF]">{formatCurrency(i.valor_unitario ?? 0)}</td>
                    <td className="px-4 py-2 text-white">{formatCurrency(i.valor_total ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end border-t border-[#1E1E1E] pt-4">
            <span className="text-lg font-bold text-white">TOTAL GERAL: {formatCurrency(totalGeral)}</span>
          </div>
        </div>

        {orcamento.observacoes && (
          <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-6">
            <h2 className="mb-2 font-semibold text-white">Observações</h2>
            <p className="text-sm text-[#9CA3AF]">{orcamento.observacoes}</p>
          </div>
        )}

        {orcamento.imagem_orc_url && (
          <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-6 text-center">
            <h2 className="mb-4 font-semibold text-white">Imagem do Orçamento</h2>
            <img
              src={orcamento.imagem_orc_url}
              alt="Orçamento"
              className="mx-auto mb-4 max-h-[500px] rounded-lg shadow-xl shadow-black/50"
            />
            <Button variant="secondary" onClick={() => window.open(orcamento.imagem_orc_url, "_blank")}>
              Ver Imagem Completa
            </Button>
          </div>
        )}
      </div>

      <ModalConfirmacao
        isOpen={modalConvert}
        onClose={() => setModalConvert(false)}
        onConfirm={converterEmOS}
        title="Converter em OS"
        message="Deseja criar uma Ordem de Serviço a partir deste orçamento? O orçamento será marcado como aprovado."
        loading={convertendo}
        confirmLabel="Converter"
        confirmVariant="primary"
      />
    </AppLayout>
  );
}
