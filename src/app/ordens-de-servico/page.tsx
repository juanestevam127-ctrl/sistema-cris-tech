"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ModalConfirmacao } from "@/components/manutencao/ModalConfirmacao";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { Eye, Pencil, Trash2, Shield } from "lucide-react";
import toast from "react-hot-toast";
import type { CrisTechOS } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  aberta: "bg-[#3B82F6]",
  em_andamento: "bg-[#F59E0B]",
  aguardando_pecas: "bg-[#F97316]",
  concluida: "bg-[#22C55E]",
  cancelada: "bg-[#6B7280]",
};

const PAGE_SIZE = 20;

export default function OrdensServicoPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [ordens, setOrdens] = useState<(CrisTechOS & { cris_tech_clientes?: { nome: string }; cris_tech_usuarios?: { nome: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [confirmExcluir, setConfirmExcluir] = useState<CrisTechOS | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [pagina, setPagina] = useState(0);

  const podeExcluir = usuario?.role === "master" || usuario?.role === "admin";

  const fetchOrdens = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("cris_tech_ordens_servico")
      .select(
        "*, cris_tech_clientes!cliente_id(nome), cris_tech_usuarios!tecnico_responsavel(nome)"
      )
      .order("data_abertura", { ascending: false });
    if (filtroStatus !== "todos") q = q.eq("status", filtroStatus);
    if (filtroTipo !== "todos") q = q.eq("tipo", filtroTipo);
    const { data } = await q;
    let lista = (data ?? []) as (CrisTechOS & { cris_tech_clientes?: { nome: string }; cris_tech_usuarios?: { nome: string } })[];
    if (busca) {
      const b = busca.toLowerCase();
      lista = lista.filter(
        (o) =>
          String(o.numero_os).includes(busca) ||
          o.cris_tech_clientes?.nome?.toLowerCase().includes(b)
      );
    }
    setOrdens(lista);
    setLoading(false);
  }, [busca, filtroStatus, filtroTipo]);

  useEffect(() => {
    fetchOrdens();
  }, [fetchOrdens]);

  const paginados = ordens.slice(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE);
  const totalPaginas = Math.ceil(ordens.length / PAGE_SIZE) || 1;

  const garantiaExpirando = (o: CrisTechOS) => {
    if (!o.data_vencimento_garantia || o.status !== "concluida") return false;
    const venc = new Date(o.data_vencimento_garantia);
    const hoje = new Date();
    const diff = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
  };

  const excluir = async () => {
    if (!confirmExcluir) return;
    setExcluindo(true);
    try {
      const { error } = await supabase
        .from("cris_tech_ordens_servico")
        .delete()
        .eq("id", confirmExcluir.id);
      if (error) throw error;
      toast.success("OS excluída.");
      setConfirmExcluir(null);
      fetchOrdens();
    } catch {
      toast.error("Erro ao excluir OS.");
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Ordens de Serviço
            </h1>
            <p className="text-[#9CA3AF]">
              Gerencie as manutenções e vendas.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push("/ordens-de-servico/nova")}
          >
            + Nova OS
          </Button>
        </div>

        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Buscar por número OS ou cliente..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(0);
            }}
            className="flex-1 min-w-[200px] rounded-lg border border-[#1E1E1E] bg-[#111111] px-4 py-2 text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
          />
          <select
            value={filtroStatus}
            onChange={(e) => {
              setFiltroStatus(e.target.value);
              setPagina(0);
            }}
            className="rounded-lg border border-[#1E1E1E] bg-[#111111] px-4 py-2 text-white"
          >
            <option value="todos">Status: Todos</option>
            <option value="aberta">Aberta</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="aguardando_pecas">Aguardando Peças</option>
            <option value="concluida">Concluída</option>
            <option value="cancelada">Cancelada</option>
          </select>
          <select
            value={filtroTipo}
            onChange={(e) => {
              setFiltroTipo(e.target.value);
              setPagina(0);
            }}
            className="rounded-lg border border-[#1E1E1E] bg-[#111111] px-4 py-2 text-white"
          >
            <option value="todos">Tipo: Todos</option>
            <option value="manutencao">Manutenção</option>
            <option value="venda_equipamento">Venda de Equipamento</option>
            <option value="instalacao">Instalação</option>
            <option value="outros">Outros</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#1E1E1E] bg-[#111111]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CC0000] border-t-transparent" />
            </div>
          ) : (
            <>
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-[#1E1E1E]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">
                      # OS
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">
                      Data
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">
                      Técnico
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">
                      Valor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">
                      Garantia
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginados.map((o) => (
                    <tr
                      key={o.id}
                      className={`border-b border-[#1E1E1E] transition-colors hover:bg-[#1E1E1E] last:border-0 ${
                        garantiaExpirando(o) ? "bg-amber-900/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-white">
                          OS-{String(o.numero_os).padStart(4, "0")}
                        </span>
                        {garantiaExpirando(o) && (
                          <Shield className="ml-1 inline h-4 w-4 text-amber-500" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#9CA3AF]">
                        {(o.cliente as { nome?: string })?.nome ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[#9CA3AF]">
                        {o.tipo.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            STATUS_COLORS[o.status] ?? "bg-[#1E1E1E]"
                          }`}
                        >
                          {o.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#9CA3AF]">
                        {formatDate(o.data_abertura)}
                      </td>
                      <td className="px-4 py-3 text-[#9CA3AF]">
                        {o.cris_tech_usuarios?.nome ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-white">
                        {formatCurrency(o.valor_total ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-[#9CA3AF]">
                        {o.garantia_meses ? `${o.garantia_meses} m` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/ordens-de-servico/${o.id}`)
                            }
                            className="rounded p-1.5 text-[#9CA3AF] hover:bg-[#1E1E1E] hover:text-white"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/ordens-de-servico/${o.id}/editar`)
                            }
                            className="rounded p-1.5 text-[#9CA3AF] hover:bg-[#1E1E1E] hover:text-white"
                          >
                            <Pencil size={16} />
                          </button>
                          {podeExcluir && (
                            <button
                              type="button"
                              onClick={() => setConfirmExcluir(o)}
                              className="rounded p-1.5 text-[#9CA3AF] hover:bg-red-900/30 hover:text-red-400"
                            >
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
                  <span className="text-sm text-[#9CA3AF]">
                    Página {pagina + 1} de {totalPaginas}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="text-sm"
                      onClick={() => setPagina((p) => Math.max(0, p - 1))}
                      disabled={pagina === 0}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="secondary"
                      className="text-sm"
                      onClick={() =>
                        setPagina((p) => Math.min(totalPaginas - 1, p + 1))
                      }
                      disabled={pagina >= totalPaginas - 1}
                    >
                      Próxima
                    </Button>
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
        title="Excluir OS"
        message="Tem certeza? Esta ação não pode ser desfeita."
        loading={excluindo}
      />
    </AppLayout>
  );
}
