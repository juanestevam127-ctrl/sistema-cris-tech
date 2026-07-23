"use client";

import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { ModalClienteDisparo } from "@/components/operacao/ModalClienteDisparo";
import { ModalConfirmacao } from "@/components/manutencao/ModalConfirmacao";
import { supabase } from "@/lib/supabaseClient";
import { UserCheck, Trash2, Pencil, Search, Phone } from "lucide-react";
import toast from "react-hot-toast";

interface ClienteDisparo {
  id: string;
  nome: string;
  telefone: string;
  created_at: string;
}

export default function ClientesDisparosPage() {
  const [clientes, setClientes] = useState<ClienteDisparo[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<ClienteDisparo | null>(null);
  const [confirmExcluir, setConfirmExcluir] = useState<ClienteDisparo | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cris_tech_clientes_disparo")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;
      setClientes(data ?? []);
    } catch (err: any) {
      toast.error("Erro ao carregar clientes.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const handleExcluir = async () => {
    if (!confirmExcluir) return;
    setExcluindo(true);
    try {
      const { error } = await supabase
        .from("cris_tech_clientes_disparo")
        .delete()
        .eq("id", confirmExcluir.id);

      if (error) throw error;
      toast.success("Cliente removido com sucesso!");
      setClientes((prev) => prev.filter((c) => c.id !== confirmExcluir.id));
      setConfirmExcluir(null);
    } catch (err: any) {
      toast.error("Erro ao excluir cliente.");
    } finally {
      setExcluindo(false);
    }
  };

  const filtrados = clientes.filter((c) => {
    const term = busca.toLowerCase();
    return (
      c.nome.toLowerCase().includes(term) ||
      c.telefone.toLowerCase().includes(term)
    );
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <UserCheck className="text-[#CC0000]" size={24} />
              Clientes para Disparos
            </h1>
            <p className="text-[#9CA3AF] text-sm">
              Gerencie a lista de contatos independentes cadastrados para o envio de mensagens em massa.
            </p>
          </div>
          <Button variant="primary" onClick={() => { setClienteEditando(null); setModalNovo(true); }}>
            + Novo Cliente
          </Button>
        </div>

        {/* Busca */}
        <div className="relative flex items-center">
          <Search size={18} className="absolute left-3 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Pesquise por nome ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-[#1E1E1E] bg-[#111] pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
          />
        </div>

        {/* Tabela de contatos */}
        <div className="overflow-x-auto rounded-xl border border-[#1E1E1E] bg-[#111111]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CC0000] border-t-transparent" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="px-4 py-12 text-center text-[#6B7280]">
              {busca ? "Nenhum cliente correspondente encontrado." : "Nenhum cliente cadastrado ainda."}
            </div>
          ) : (
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-[#1E1E1E]">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c) => (
                  <tr key={c.id} className="border-b border-[#1E1E1E] last:border-0 hover:bg-[#1A1A1A] transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-white">
                      {c.nome}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#9CA3AF]">
                      <span className="flex items-center gap-1.5">
                        <Phone size={12} className="text-[#CC0000]" />
                        {c.telefone}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => { setClienteEditando(c); setModalNovo(true); }}
                          title="Editar"
                          className="rounded p-1.5 text-[#9CA3AF] hover:bg-[#1E1E1E] hover:text-white"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmExcluir(c)}
                          title="Excluir"
                          className="rounded p-1.5 text-[#9CA3AF] hover:bg-red-900/30 hover:text-red-400"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ModalClienteDisparo
        isOpen={modalNovo}
        onClose={() => { setModalNovo(false); setClienteEditando(null); }}
        onSuccess={fetchClientes}
        cliente={clienteEditando}
      />

      <ModalConfirmacao
        isOpen={!!confirmExcluir}
        onClose={() => setConfirmExcluir(null)}
        onConfirm={handleExcluir}
        title="Remover Cliente de Disparo"
        message={`Tem certeza que deseja excluir o cliente "${confirmExcluir?.nome}" do catálogo de disparos?`}
        loading={excluindo}
      />
    </AppLayout>
  );
}
