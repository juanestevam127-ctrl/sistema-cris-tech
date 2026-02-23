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
import type { CrisTechOS } from "@/types";
import { format } from "date-fns";

const PAGE_SIZE = 20;

function formatBRL(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ImagemBadge({
  status,
}: {
  status: CrisTechOS["imagem_os_status"];
}) {
  const configs = {
    pendente: { cls: "bg-[#374151] text-[#9CA3AF]", label: "⏳ Pendente" },
    gerando: { cls: "bg-amber-900/40 text-amber-400", label: "🔄 Gerando" },
    concluida: { cls: "bg-green-900/40 text-green-400", label: "✅ Gerada" },
    erro: { cls: "bg-red-900/40 text-red-400", label: "❌ Erro" },
  };
  const c = configs[status] ?? configs.pendente;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.cls}`}>
      {c.label}
    </span>
  );
}

type FiltroGarantia = "todas" | "vigente" | "expirada" | "sem";

export default function OrdensServicoPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [ordens, setOrdens] = useState<CrisTechOS[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroGarantia, setFiltroGarantia] = useState<FiltroGarantia>("todas");
  const [confirmExcluir, setConfirmExcluir] = useState<CrisTechOS | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [pagina, setPagina] = useState(0);

  const podeExcluir =
    usuario?.role === "master" || usuario?.role === "admin";

  const fetchOrdens = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cris_tech_ordens_servico")
      .select("*")
      .order("created_at", { ascending: false });

    let lista = (data ?? []) as CrisTechOS[];

    // Filtro busca
    if (busca) {
      const b = busca.toLowerCase();
      lista = lista.filter(
        (o) =>
          String(o.numero_os).padStart(4, "0").includes(busca) ||
          o.cliente_nome?.toLowerCase().includes(b)
      );
    }

    // Filtro garantia
    const hoje = new Date();
    if (filtroGarantia === "sem") {
      lista = lista.filter((o) => !o.garantia_meses || o.garantia_meses === 0);
    } else if (filtroGarantia === "vigente") {
      lista = lista.filter((o) => {
        if (!o.data_vencimento_garantia) return false;
        return new Date(o.data_vencimento_garantia) >= hoje;
      });
    } else if (filtroGarantia === "expirada") {
      lista = lista.filter((o) => {
        if (!o.data_vencimento_garantia) return false;
        return new Date(o.data_vencimento_garantia) < hoje;
      });
    }

    setOrdens(lista);
    setLoading(false);
  }, [busca, filtroGarantia]);

  useEffect(() => {
    fetchOrdens();
  }, [fetchOrdens]);

  const paginados = ordens.slice(
    pagina * PAGE_SIZE,
    (pagina + 1) * PAGE_SIZE
  );
  const totalPaginas = Math.ceil(ordens.length / PAGE_SIZE) || 1;

  const garantiaLabel = (o: CrisTechOS) => {
    if (!o.garantia_meses || o.garantia_meses === 0)
      return <span className="text-[#6B7280]">—</span>;
    if (!o.data_vencimento_garantia)
      return <span className="text-[#9CA3AF]">{o.garantia_meses}m</span>;
    const venc = new Date(o.data_vencimento_garantia);
    const hoje = new Date();
    if (venc < hoje) {
      return (
        <span className="text-red-400 text-xs">
          {o.garantia_meses}m · Expirada
        </span>
      );
    }
    const diff = Math.ceil(
      (venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff <= 30) {
      return (
        <span className="text-amber-400 text-xs">
          {o.garantia_meses}m · {diff}d restantes
        </span>
      );
    }
    return (
      <span className="text-green-400 text-xs">
        {o.garantia_meses}m · Vigente
      </span>
    );
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
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Ordens de Serviço
            </h1>
            <p className="text-[#9CA3AF] text-sm">
              {ordens.length} ordem{ordens.length !== 1 ? "s" : ""} encontrada
              {ordens.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push("/ordens-de-servico/nova")}
          >
            + Nova OS
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Buscar por nº OS ou nome do cliente..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(0);
            }}
            className="flex-1 min-w-[220px] rounded-lg border border-[#1E1E1E] bg-[#111111] px-4 py-2 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
          />
          <select
            value={filtroGarantia}
            onChange={(e) => {
              setFiltroGarantia(e.target.value as FiltroGarantia);
              setPagina(0);
            }}
            className="rounded-lg border border-[#1E1E1E] bg-[#111111] px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
          >
            <option value="todas">Garantia: Todas</option>
            <option value="vigente">Vigente</option>
            <option value="expirada">Expirada</option>
            <option value="sem">Sem garantia</option>
          </select>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto rounded-xl border border-[#1E1E1E] bg-[#111111]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CC0000] border-t-transparent" />
            </div>
          ) : (
            <>
              <table className="w-full min-w-[750px]">
                <thead>
                  <tr className="border-b border-[#1E1E1E]">
                    {[
                      "# OS",
                      "Data",
                      "Cliente",
                      "Cidade / UF",
                      "Total",
                      "Garantia",
                      "Imagem",
                      "Ações",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginados.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-[#6B7280]"
                      >
                        Nenhuma OS encontrada.
                      </td>
                    </tr>
                  ) : (
                    paginados.map((o) => (
                      <tr
                        key={o.id}
                        className="border-b border-[#1E1E1E] last:border-0 hover:bg-[#1A1A1A] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="font-bold text-white">
                            OS-{String(o.numero_os).padStart(4, "0")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#9CA3AF]">
                          {o.data_os
                            ? format(
                              new Date(o.data_os + "T12:00:00"),
                              "dd/MM/yyyy"
                            )
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-white max-w-[180px] truncate">
                          {o.cliente_nome || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#9CA3AF]">
                          {o.cliente_cidade && o.cliente_estado
                            ? `${o.cliente_cidade} / ${o.cliente_estado}`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#CC0000]">
                          {formatBRL(o.valor_total ?? 0)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {garantiaLabel(o)}
                        </td>
                        <td className="px-4 py-3">
                          <ImagemBadge status={o.imagem_os_status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(`/ordens-de-servico/${o.id}`)
                              }
                              title="Visualizar"
                              className="rounded p-1.5 text-[#9CA3AF] hover:bg-[#1E1E1E] hover:text-white"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/ordens-de-servico/${o.id}/editar`
                                )
                              }
                              title="Editar"
                              className="rounded p-1.5 text-[#9CA3AF] hover:bg-[#1E1E1E] hover:text-white"
                            >
                              <Pencil size={15} />
                            </button>
                            {podeExcluir && (
                              <button
                                type="button"
                                onClick={() => setConfirmExcluir(o)}
                                title="Excluir"
                                className="rounded p-1.5 text-[#9CA3AF] hover:bg-red-900/30 hover:text-red-400"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
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
        message={`Tem certeza que deseja excluir a OS-${String(confirmExcluir?.numero_os ?? "").padStart(4, "0")}? Esta ação não pode ser desfeita.`}
        loading={excluindo}
      />
    </AppLayout>
  );
}
