"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useClientes } from "@/hooks/useClientes";
import { AppLayout } from "@/components/layout/AppLayout";
import { ModalCliente } from "@/components/manutencao/ModalCliente";
import { ModalConfirmacao } from "@/components/manutencao/ModalConfirmacao";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import type { CrisTechCliente } from "@/types";
import { formatCpfCnpj, formatPhone } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function ClientesPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [modalCliente, setModalCliente] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<CrisTechCliente | null>(null);
  const [confirmExcluir, setConfirmExcluir] = useState<CrisTechCliente | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [pagina, setPagina] = useState(0);

  const { clientes, loading, refetch } = useClientes(buscaDebounced, tipoFiltro);

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  const podeExcluir = usuario?.role === "master" || usuario?.role === "admin";

  const paginados = clientes.slice(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE);
  const totalPaginas = Math.ceil(clientes.length / PAGE_SIZE) || 1;

  const abrirNovo = () => {
    setClienteEditando(null);
    setModalCliente(true);
  };

  const abrirEditar = (c: CrisTechCliente, e: React.MouseEvent) => {
    e.stopPropagation();
    setClienteEditando(c);
    setModalCliente(true);
  };

  const excluirCliente = async () => {
    if (!confirmExcluir) return;
    setExcluindo(true);
    try {
      const { error } = await supabase
        .from("cris_tech_clientes")
        .delete()
        .eq("id", confirmExcluir.id);
      if (error) throw error;
      toast.success("Cliente excluído.");
      setConfirmExcluir(null);
      refetch();
    } catch {
      toast.error("Erro ao excluir cliente.");
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Clientes</h1>
            <p className="text-[#9CA3AF]">Gerencie os clientes da empresa.</p>
          </div>
          <Button variant="primary" onClick={abrirNovo}>
            + Novo Cliente
          </Button>
        </div>

        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Buscar por nome, CPF/CNPJ, telefone..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(0);
            }}
            className="flex-1 min-w-[200px] rounded-lg border border-[#1E1E1E] bg-[#111111] px-4 py-2 text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
          />
          <select
            value={tipoFiltro}
            onChange={(e) => {
              setTipoFiltro(e.target.value);
              setPagina(0);
            }}
            className="rounded-lg border border-[#1E1E1E] bg-[#111111] px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
          >
            <option value="todos">Todos</option>
            <option value="pessoa_fisica">Pessoa Física</option>
            <option value="pessoa_juridica">Pessoa Jurídica</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#1E1E1E] bg-[#111111]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CC0000] border-t-transparent" />
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1E1E1E]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">
                      Nome
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">
                      CPF/CNPJ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">
                      Telefone/Celular
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">
                      Cidade/Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginados.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/clientes/${c.id}`)}
                      className="cursor-pointer border-b border-[#1E1E1E] transition-colors hover:bg-[#1E1E1E] last:border-0"
                    >
                      <td className="px-4 py-3 text-white">{c.nome}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            c.tipo === "pessoa_fisica"
                              ? "bg-[#1E1E1E] text-[#9CA3AF]"
                              : "bg-amber-900/30 text-amber-400"
                          }`}
                        >
                          {c.tipo === "pessoa_fisica" ? "PF" : "PJ"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#9CA3AF]">
                        {formatCpfCnpj(c.cpf_cnpj) || "—"}
                      </td>
                      <td className="px-4 py-3 text-[#9CA3AF]">
                        {formatPhone(c.celular || c.telefone) || "—"}
                      </td>
                      <td className="px-4 py-3 text-[#9CA3AF]">
                        {[c.cidade, c.estado].filter(Boolean).join("/") || "—"}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={(ev) => abrirEditar(c, ev)}
                            className="rounded p-1.5 text-[#9CA3AF] hover:bg-[#1E1E1E] hover:text-white"
                          >
                            <Pencil size={16} />
                          </button>
                          {podeExcluir && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmExcluir(c);
                              }}
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
                      onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
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

      <ModalCliente
        isOpen={modalCliente}
        onClose={() => {
          setModalCliente(false);
          setClienteEditando(null);
        }}
        cliente={clienteEditando}
        onSuccess={refetch}
      />
      <ModalConfirmacao
        isOpen={!!confirmExcluir}
        onClose={() => setConfirmExcluir(null)}
        onConfirm={excluirCliente}
        title="Excluir cliente"
        message="Tem certeza? Esta ação não pode ser desfeita."
        loading={excluindo}
      />
    </AppLayout>
  );
}
