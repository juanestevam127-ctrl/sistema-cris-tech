"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useClientesAll } from "@/hooks/useClientesAll";
import { useUsuarios } from "@/hooks/useUsuarios";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

export default function NovaOSPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientePreSelect = searchParams.get("cliente");
  const { usuario } = useAuth();
  const { clientes } = useClientesAll();
  const { usuarios } = useUsuarios();
  const [clienteId, setClienteId] = useState("");
  const [tipo, setTipo] = useState("manutencao");
  const [status, setStatus] = useState("aberta");
  const [dataAbertura, setDataAbertura] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dataConclusao, setDataConclusao] = useState("");
  const [descricaoProblema, setDescricaoProblema] = useState("");
  const [servicosRealizados, setServicosRealizados] = useState("");
  const [pecasUtilizadas, setPecasUtilizadas] = useState("");
  const [valorServico, setValorServico] = useState("");
  const [valorPecas, setValorPecas] = useState("");
  const [garantiaMeses, setGarantiaMeses] = useState("0");
  const [observacoes, setObservacoes] = useState("");
  const [tecnicoId, setTecnicoId] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (clientePreSelect) setClienteId(clientePreSelect);
  }, [clientePreSelect]);

  const valorS = parseFloat(valorServico.replace(",", ".")) || 0;
  const valorP = parseFloat(valorPecas.replace(",", ".")) || 0;
  const total = valorS + valorP;

  const salvar = async () => {
    if (!clienteId) {
      toast.error("Selecione o cliente.");
      return;
    }
    if (!servicosRealizados.trim()) {
      toast.error("Descreva o que foi feito.");
      return;
    }
    setSalvando(true);
    try {
      const { data, error } = await supabase
        .from("cris_tech_ordens_servico")
        .insert({
          cliente_id: clienteId,
          tipo,
          status,
          data_abertura: dataAbertura,
          data_conclusao: status === "concluida" ? dataConclusao || null : null,
          descricao_problema: descricaoProblema || null,
          servicos_realizados: servicosRealizados,
          pecas_utilizadas: pecasUtilizadas || null,
          valor_servico: valorS,
          valor_pecas: valorP,
          valor_total: total,
          garantia_meses: parseInt(garantiaMeses, 10) || 0,
          data_vencimento_garantia:
            status === "concluida" && parseInt(garantiaMeses, 10) > 0 && dataConclusao
              ? new Date(
                  new Date(dataConclusao).getTime() +
                    parseInt(garantiaMeses, 10) * 30 * 24 * 60 * 60 * 1000
                )
                  .toISOString()
                  .split("T")[0]
              : null,
          observacoes: observacoes || null,
          tecnico_responsavel: tecnicoId || null,
          criado_por: usuario?.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("OS criada!");
      router.push(`/ordens-de-servico/${(data as { id: string }).id}`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao criar OS.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold text-white">Nova Ordem de Serviço</h1>
        <div className="space-y-4 rounded-lg border border-[#1E1E1E] bg-[#111111] p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">CLIENTE *</label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-white"
            >
              <option value="">Selecione...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">TIPO</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-white">
                <option value="manutencao">Manutenção</option>
                <option value="venda_equipamento">Venda de Equipamento</option>
                <option value="instalacao">Instalação</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">STATUS</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-white">
                <option value="aberta">Aberta</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="aguardando_pecas">Aguardando Peças</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">DATA ABERTURA *</label>
              <Input type="date" value={dataAbertura} onChange={(e) => setDataAbertura(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">DATA CONCLUSÃO</label>
              <Input type="date" value={dataConclusao} onChange={(e) => setDataConclusao(e.target.value)} disabled={status !== "concluida"} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">TÉCNICO</label>
            <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-white">
              <option value="">—</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nome || u.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">PROBLEMA RELATADO</label>
            <Textarea value={descricaoProblema} onChange={(e) => setDescricaoProblema(e.target.value)} rows={3} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">O QUE FOI FEITO *</label>
            <Textarea value={servicosRealizados} onChange={(e) => setServicosRealizados(e.target.value)} rows={3} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">PEÇAS / EQUIPAMENTOS</label>
            <Textarea value={pecasUtilizadas} onChange={(e) => setPecasUtilizadas(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">VALOR SERVIÇO (R$)</label>
              <Input value={valorServico} onChange={(e) => setValorServico(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">VALOR PEÇAS (R$)</label>
              <Input value={valorPecas} onChange={(e) => setValorPecas(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">TOTAL</label>
              <Input value={total.toFixed(2)} readOnly className="bg-[#1E1E1E]" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">GARANTIA (MESES)</label>
            <Input type="number" min={0} value={garantiaMeses} onChange={(e) => setGarantiaMeses(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">OBSERVAÇÕES</label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => router.back()}>Cancelar</Button>
            <Button variant="primary" onClick={salvar} loading={salvando}>Salvar OS</Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
