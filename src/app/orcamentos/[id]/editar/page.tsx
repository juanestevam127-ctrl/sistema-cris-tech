"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useClientesAll } from "@/hooks/useClientesAll";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { supabase } from "@/lib/supabaseClient";
import { Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";

interface ItemOrc {
  id: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  dbId?: string;
}

export default function EditarOrcamentoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { usuario } = useAuth();
  const { clientes } = useClientesAll();
  const [loading, setLoading] = useState(true);
  const [clienteId, setClienteId] = useState("");
  const [status, setStatus] = useState("pendente");
  const [dataEmissao, setDataEmissao] = useState("");
  const [dataValidade, setDataValidade] = useState("");
  const [descricao, setDescricao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<ItemOrc[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: orc } = await supabase.from("cris_tech_orcamentos").select("*").eq("id", id).single();
      const { data: itensData } = await supabase.from("cris_tech_orcamento_itens").select("*").eq("orcamento_id", id).order("ordem");
      if (orc) {
        setClienteId(orc.cliente_id);
        setStatus(orc.status);
        setDataEmissao(orc.data_emissao?.split("T")[0] ?? "");
        setDataValidade(orc.data_validade?.split("T")[0] ?? "");
        setDescricao(orc.descricao ?? "");
        setObservacoes(orc.observacoes ?? "");
        setItens(
          ((itensData ?? []) as { id: string; descricao: string; quantidade: number; valor_unitario: number }[]).map(
            (i) => ({
              id: crypto.randomUUID(),
              dbId: i.id,
              descricao: i.descricao,
              quantidade: i.quantidade,
              valorUnitario: i.valor_unitario,
            })
          )
        );
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const addItem = () => {
    setItens((prev) => [...prev, { id: crypto.randomUUID(), descricao: "", quantidade: 1, valorUnitario: 0 }]);
  };

  const updateItem = (itemId: string, field: keyof ItemOrc, value: string | number) => {
    setItens((prev) => prev.map((i) => (i.id === itemId ? { ...i, [field]: value } : i)));
  };

  const removeItem = (itemId: string) => {
    if (itens.length <= 1) return;
    setItens((prev) => prev.filter((i) => i.id !== itemId));
  };

  const totalGeral = itens.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0);

  const salvar = async () => {
    if (!clienteId) {
      toast.error("Selecione o cliente.");
      return;
    }
    const itensValidos = itens.filter((i) => i.descricao.trim());
    if (!itensValidos.length) {
      toast.error("Adicione pelo menos um item.");
      return;
    }
    setSalvando(true);
    try {
      await supabase
        .from("cris_tech_orcamentos")
        .update({
          cliente_id: clienteId,
          status,
          data_emissao: dataEmissao,
          data_validade: dataValidade || null,
          descricao: descricao || null,
          observacoes: observacoes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      await supabase.from("cris_tech_orcamento_itens").delete().eq("orcamento_id", id);
      for (let idx = 0; idx < itensValidos.length; idx++) {
        const i = itensValidos[idx];
        await supabase.from("cris_tech_orcamento_itens").insert({
          orcamento_id: id,
          descricao: i.descricao.trim(),
          quantidade: i.quantidade,
          valor_unitario: i.valorUnitario,
          ordem: idx,
        });
      }
      toast.success("Orçamento atualizado!");
      router.push(`/orcamentos/${id}`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
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
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold text-white">Editar Orçamento</h1>
        <div className="space-y-4 rounded-lg border border-[#1E1E1E] bg-[#111111] p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">CLIENTE *</label>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-white">
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">STATUS</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-white">
                <option value="pendente">Pendente</option>
                <option value="aprovado">Aprovado</option>
                <option value="recusado">Recusado</option>
                <option value="expirado">Expirado</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">DATA EMISSÃO *</label>
              <Input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">DATA VALIDADE</label>
              <Input type="date" value={dataValidade} onChange={(e) => setDataValidade(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">DESCRIÇÃO GERAL</label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#9CA3AF]">ITENS</label>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto rounded border border-[#1E1E1E]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1E1E1E]">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[#9CA3AF]">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[#9CA3AF]">Descrição *</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[#9CA3AF]">Qtd *</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[#9CA3AF]">Valor Unit. *</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[#9CA3AF]">Total</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[#9CA3AF]"></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item, idx) => (
                    <tr key={item.id} className="border-b border-[#1E1E1E] last:border-0">
                      <td className="px-3 py-2 text-[#9CA3AF]">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <input value={item.descricao} onChange={(e) => updateItem(item.id, "descricao", e.target.value)} className="w-full min-w-[200px] rounded border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1.5 text-sm text-white" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0.01} step={0.01} value={item.quantidade} onChange={(e) => updateItem(item.id, "quantidade", parseFloat(e.target.value) || 0)} className="w-20 rounded border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1.5 text-sm text-white" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} step={0.01} value={item.valorUnitario} onChange={(e) => updateItem(item.id, "valorUnitario", parseFloat(e.target.value) || 0)} className="w-28 rounded border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1.5 text-sm text-white" />
                      </td>
                      <td className="px-3 py-2 text-[#9CA3AF]">{formatCurrency(item.quantidade * item.valorUnitario)}</td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => removeItem(item.id)} className="rounded p-1 text-red-500 hover:bg-red-900/30">
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {itens.map((item, idx) => (
                <div key={item.id} className="rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#CC0000]">ITEM #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-400"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-[#4B5563]">Descrição *</label>
                    <input
                      value={item.descricao}
                      onChange={(e) => updateItem(item.id, "descricao", e.target.value)}
                      placeholder="Descrição do item"
                      className="w-full rounded border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-[#4B5563]">Qtd *</label>
                      <input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={item.quantidade}
                        onChange={(e) => updateItem(item.id, "quantidade", parseFloat(e.target.value) || 0)}
                        className="w-full rounded border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-[#4B5563]">Val. Unit. *</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.valorUnitario}
                        onChange={(e) => updateItem(item.id, "valorUnitario", parseFloat(e.target.value) || 0)}
                        className="w-full rounded border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>

                  <div className="rounded border border-[#1E1E1E] bg-[#1A1A1A] p-2 text-center text-sm font-bold text-white">
                    Total: {formatCurrency(item.quantidade * item.valorUnitario)}
                  </div>
                </div>
              ))}
            </div>

            <Button variant="secondary" className="mt-2 w-full md:w-auto gap-1" onClick={addItem}>
              <Plus size={16} /> Adicionar Item ({itens.length}/5)
            </Button>
          </div>
          <div className="flex justify-between border-t border-[#1E1E1E] pt-4">
            <span className="font-semibold text-white">TOTAL GERAL:</span>
            <span className="text-lg font-bold text-[#CC0000]">{formatCurrency(totalGeral)}</span>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">OBSERVAÇÕES</label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <Button variant="ghost" className="w-full sm:w-auto order-2 sm:order-1" onClick={() => router.back()}>Cancelar</Button>
            <Button variant="primary" className="w-full sm:w-auto order-1 sm:order-2" onClick={salvar} loading={salvando}>Salvar</Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
