"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ModalConfirmacao } from "@/components/manutencao/ModalConfirmacao";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { Eye, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import type { CrisTechOrcamento } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-[#F59E0B]",
  aprovado: "bg-[#22C55E]",
  recusado: "bg-[#CC0000]",
  expirado: "bg-[#6B7280]",
};

const PAGE_SIZE = 20;

function totalOrcamento(o: CrisTechOrcamento & { cris_tech_orcamento_itens?: { valor_total: number }[] }) {
  const itens = o.cris_tech_orcamento_itens ?? o.itens ?? [];
  return (itens as { valor_total?: number }[]).reduce((s, i) => s + (i.valor_total ?? 0), 0);
}

export default function OrcamentosPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [orcamentos, setOrcamentos] = useState<(CrisTechOrcamento & { cris_tech_clientes?: { nome: string }; cris_tech_orcamento_itens?: { valor_total: number }[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [confirmExcluir, setConfirmExcluir] = useState<CrisTechOrcamento | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [pagina, setPagina] = useState(0);

  // Removida restrição conforme solicitação
  const podeExcluir = true;

  const fetchOrc = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("cris_tech_orcamentos")
      .select("*, cris_tech_clientes!cliente_id(nome), cris_tech_orcamento_itens(valor_total)")
      .order("data_emissao", { ascending: false });

    if (filtroStatus !== "todos") q = q.eq("status", filtroStatus);
    if (dataInicio) q = q.gte("data_emissao", dataInicio);
    if (dataFim) q = q.lte("data_emissao", dataFim);

    const { data } = await q;
    let lista = (data ?? []) as (CrisTechOrcamento & { cris_tech_clientes?: { nome: string }; cris_tech_orcamento_itens?: { valor_total: number }[] })[];
    if (busca) {
      const b = busca.toLowerCase();
      lista = lista.filter(
        (o) =>
          String(o.numero_orcamento).includes(busca) ||
          (o.cris_tech_clientes?.nome?.toLowerCase().includes(b))
      );
    }
    const hoje = new Date().toISOString().split("T")[0];
    for (const o of lista) {
      if (o.status === "pendente" && o.data_validade && o.data_validade < hoje) {
        await supabase
          .from("cris_tech_orcamentos")
          .update({ status: "expirado" })
          .eq("id", o.id);
        o.status = "expirado";
      }
    }
    setOrcamentos(lista);
    setLoading(false);
  }, [busca, filtroStatus, dataInicio, dataFim]);

  useEffect(() => {
    fetchOrc();
  }, [fetchOrc]);

  // Resumos
  const totalGeral = orcamentos.reduce((s, o) => s + totalOrcamento(o), 0);
  const aprovados = orcamentos.filter(o => o.status === 'aprovado').length;
  const pendentes = orcamentos.filter(o => o.status === 'pendente').length;

  const paginados = orcamentos.slice(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE);
  const totalPaginas = Math.ceil(orcamentos.length / PAGE_SIZE) || 1;

  const excluir = async () => {
    if (!confirmExcluir) return;
    setExcluindo(true);
    try {
      const { error } = await supabase
        .from("cris_tech_orcamentos")
        .delete()
        .eq("id", confirmExcluir.id);
      if (error) throw error;
      toast.success("Orçamento excluído.");
      setConfirmExcluir(null);
      fetchOrc();
    } catch {
      toast.error("Erro ao excluir.");
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Orçamentos</h1>
            <p className="text-[#9CA3AF]">Gerencie as propostas comerciais.</p>
          </div>
          <Button variant="primary" onClick={() => router.push("/orcamentos/nova")}>
            + Novo Orçamento
          </Button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-4">
            <p className="text-xs uppercase tracking-wider text-[#9CA3AF]">Pendentes</p>
            <p className="mt-1 text-2xl font-bold text-amber-500">{pendentes}</p>
          </div>
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-4">
            <p className="text-xs uppercase tracking-wider text-[#9CA3AF]">Aprovados no período</p>
            <p className="mt-1 text-2xl font-bold text-green-500">{aprovados}</p>
          </div>
          <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-4">
            <p className="text-xs uppercase tracking-wider text-[#9CA3AF]">Total no período</p>
            <p className="mt-1 text-2xl font-bold text-[#CC0000]">
              {totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#1E1E1E] bg-[#111111] p-4">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-[10px] font-bold uppercase text-[#4B5563]">Busca</label>
            <input
              type="text"
              placeholder="Nº ou cliente..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(0);
              }}
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
            />
          </div>

          <div className="w-full sm:w-40">
            <label className="mb-1 block text-[10px] font-bold uppercase text-[#4B5563]">Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => {
                setDataInicio(e.target.value);
                setPagina(0);
              }}
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
            />
          </div>

          <div className="w-full sm:w-40">
            <label className="mb-1 block text-[10px] font-bold uppercase text-[#4B5563]">Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => {
                setDataFim(e.target.value);
                setPagina(0);
              }}
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
            />
          </div>

          <div className="w-full sm:w-44">
            <label className="mb-1 block text-[10px] font-bold uppercase text-[#4B5563]">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => {
                setFiltroStatus(e.target.value);
                setPagina(0);
              }}
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2 text-sm text-white"
            >
              <option value="todos">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="aprovado">Aprovado</option>
              <option value="recusado">Recusado</option>
              <option value="expirado">Expirado</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#1E1E1E] bg-[#111111]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CC0000] border-t-transparent" />
            </div>
          ) : (
            <>
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#1E1E1E]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]"># ORC</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">Emissão</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">Validade</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginados.map((o) => (
                    <tr key={o.id} className="border-b border-[#1E1E1E] hover:bg-[#1E1E1E] last:border-0">
                      <td className="px-4 py-3 font-medium text-white">
                        ORC-{String(o.numero_orcamento).padStart(4, "0")}
                      </td>
                      <td className="px-4 py-3 text-[#9CA3AF]">{o.cris_tech_clientes?.nome ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLORS[o.status] ?? "bg-[#1E1E1E]"}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#9CA3AF]">{formatDate(o.data_emissao)}</td>
                      <td className="px-4 py-3 text-[#9CA3AF]">{formatDate(o.data_validade) || "—"}</td>
                      <td className="px-4 py-3 text-white">{formatCurrency(totalOrcamento(o))}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button type="button" onClick={() => router.push(`/orcamentos/${o.id}`)} className="rounded p-1.5 text-[#9CA3AF] hover:bg-[#1E1E1E] hover:text-white">
                            <Eye size={16} />
                          </button>
                          <button type="button" onClick={() => router.push(`/orcamentos/${o.id}/editar`)} className="rounded p-1.5 text-[#9CA3AF] hover:bg-[#1E1E1E] hover:text-white">
                            <Pencil size={16} />
                          </button>
                          {podeExcluir && (
                            <button type="button" onClick={() => setConfirmExcluir(o)} className="rounded p-1.5 text-[#9CA3AF] hover:bg-red-900/30 hover:text-red-400">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between border-t border-[#1E1E1E] px-4 py-3">
                  <span className="text-sm text-[#9CA3AF]">Página {pagina + 1} de {totalPaginas}</span>
                  <div className="flex gap-2">
                    <Button variant="secondary" className="text-sm" onClick={() => setPagina((p) => Math.max(0, p - 1))} disabled={pagina === 0}>Anterior</Button>
                    <Button variant="secondary" className="text-sm" onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))} disabled={pagina >= totalPaginas - 1}>Próxima</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ModalConfirmacao
        isOpen={!!confirmExcluir}
        onClose={() => setConfirmExcluir(null)}
        onConfirm={excluir}
        title="Excluir orçamento"
        message="Tem certeza? Esta ação não pode ser desfeita."
        loading={excluindo}
      />
    </AppLayout>
  );
}
