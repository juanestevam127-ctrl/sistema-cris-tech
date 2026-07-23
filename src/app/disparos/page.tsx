"use client";

import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { ModalDisparo } from "@/components/operacao/ModalDisparo";
import { ModalConfirmacao } from "@/components/manutencao/ModalConfirmacao";
import { supabase } from "@/lib/supabaseClient";
import { Send, MessageSquare, Image as ImageIcon, Trash2, Play, AlertCircle, CheckCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { formatDate, formatDateTime } from "@/lib/utils";

interface Disparo {
  id: string;
  tipo: "texto" | "texto_imagem" | "imagem";
  texto: string;
  imagem_url?: string;
  destinatario?: "grupo" | "clientes";
  status: "pendente" | "enviado" | "erro";
  erro_mensagem?: string;
  agendado_para?: string;
  created_at: string;
}

export default function DisparosPage() {
  const [disparos, setDisparos] = useState<Disparo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [confirmExcluir, setConfirmExcluir] = useState<Disparo | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [disparandoFila, setDisparandoFila] = useState<string | null>(null);

  const fetchDisparos = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cris_tech_disparos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDisparos(data ?? []);
    } catch (err: any) {
      toast.error("Erro ao buscar disparos.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisparos();
  }, [fetchDisparos]);

  const excluirDisparo = async () => {
    if (!confirmExcluir) return;
    setExcluindo(true);
    try {
      const { error } = await supabase
        .from("cris_tech_disparos")
        .delete()
        .eq("id", confirmExcluir.id);

      if (error) throw error;
      toast.success("Disparo removido.");
      setDisparos((prev) => prev.filter((d) => d.id !== confirmExcluir.id));
      setConfirmExcluir(null);
    } catch (err: any) {
      toast.error("Erro ao excluir disparo.");
    } finally {
      setExcluindo(false);
    }
  };

  const dispararRascunho = async (disparo: Disparo) => {
    setDisparandoFila(disparo.id);
    try {
      const { error: dbErr } = await supabase
        .from("cris_tech_disparos")
        .update({ agendado_para: new Date(Date.now() - 60000).toISOString() })
        .eq("id", disparo.id);

      if (dbErr) throw dbErr;

      const triggerRes = await fetch("/api/cron/process-dispatches");
      const triggerData = await triggerRes.json();
      
      if (!triggerRes.ok) {
        throw new Error(triggerData.error ?? "Erro ao processar disparo imediato.");
      }

      toast.success("Disparo enviado com sucesso!");
      fetchDisparos();
    } catch (err: any) {
      toast.error(`Falha ao disparar: ${err.message}`);
      await supabase
        .from("cris_tech_disparos")
        .update({
          status: "erro",
          erro_mensagem: err.message || "Erro de envio",
          updated_at: new Date().toISOString()
        })
        .eq("id", disparo.id);
      fetchDisparos();
    } finally {
      setDisparandoFila(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Send className="text-[#CC0000]" size={24} />
              Disparos de Mensagens
            </h1>
            <p className="text-[#9CA3AF] text-sm">
              Histórico e envio em massa para grupos de WhatsApp/Telegram.
            </p>
          </div>
          <Button variant="primary" onClick={() => setModalNovo(true)}>
            + Criar Disparo
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-x-auto rounded-xl border border-[#1E1E1E] bg-[#111111]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CC0000] border-t-transparent" />
            </div>
          ) : disparos.length === 0 ? (
            <div className="px-4 py-12 text-center text-[#6B7280]">
              Nenhum disparo realizado ou agendado.
            </div>
          ) : (
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-[#1E1E1E]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Destino
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Mensagem
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Mídia
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {disparos.map((d) => (
                  <tr key={d.id} className="border-b border-[#1E1E1E] last:border-0 hover:bg-[#1A1A1A] transition-colors">
                    <td className="px-4 py-3">
                      {d.tipo === "texto_imagem" && (
                        <span className="flex items-center gap-1.5 rounded bg-blue-900/30 text-blue-400 px-2 py-0.5 text-xs font-medium w-fit border border-blue-900/50">
                          <ImageIcon size={12} /> Imagem + Texto
                        </span>
                      )}
                      {d.tipo === "texto" && (
                        <span className="flex items-center gap-1.5 rounded bg-gray-800 text-gray-300 px-2 py-0.5 text-xs font-medium w-fit border border-gray-700">
                          <MessageSquare size={12} /> Apenas Texto
                        </span>
                      )}
                      {d.tipo === "imagem" && (
                        <span className="flex items-center gap-1.5 rounded bg-purple-900/30 text-purple-400 px-2 py-0.5 text-xs font-medium w-fit border border-purple-900/50">
                          <ImageIcon size={12} /> Apenas Imagem
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {d.destinatario === "clientes" ? (
                        <span className="text-amber-400 font-medium">Clientes</span>
                      ) : (
                        <span className="text-blue-400 font-medium">Grupos</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-white max-w-[300px] truncate" title={d.texto}>
                      {d.texto}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#9CA3AF]">
                      {d.imagem_url ? (
                        <a href={d.imagem_url} target="_blank" rel="noreferrer" className="text-[#CC0000] hover:underline flex items-center gap-1">
                          Visualizar
                        </a>
                      ) : (
                        <span className="text-[#6B7280]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#9CA3AF]">
                      {formatDate(d.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {d.status === "enviado" && (
                        <span className="flex items-center gap-1 text-green-400 text-xs font-semibold">
                          <CheckCircle size={12} /> Enviado
                        </span>
                      )}
                      {d.status === "pendente" && (
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1 text-amber-400 text-xs font-semibold">
                            <Clock size={12} /> {d.agendado_para && new Date(d.agendado_para) > new Date() ? "Agendado" : "Rascunho"}
                          </span>
                          {d.agendado_para && new Date(d.agendado_para) > new Date() && (
                            <span className="text-[10px] text-[#9CA3AF] mt-0.5 font-medium">
                              {formatDateTime(d.agendado_para)}
                            </span>
                          )}
                        </div>
                      )}
                      {d.status === "erro" && (
                        <span className="flex items-center gap-1 text-red-400 text-xs font-semibold cursor-help" title={d.erro_mensagem || "Erro no envio"}>
                          <AlertCircle size={12} /> Falha
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {d.status !== "enviado" && (
                          <button
                            type="button"
                            onClick={() => dispararRascunho(d)}
                            disabled={disparandoFila === d.id}
                            title="Disparar Mensagem"
                            className="rounded p-1 text-[#9CA3AF] hover:bg-green-950/20 hover:text-green-400 disabled:opacity-20"
                          >
                            <Play size={15} className={disparandoFila === d.id ? "animate-pulse" : ""} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setConfirmExcluir(d)}
                          title="Excluir"
                          className="rounded p-1 text-[#9CA3AF] hover:bg-red-900/30 hover:text-red-400"
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

      <ModalDisparo
        isOpen={modalNovo}
        onClose={() => setModalNovo(false)}
        onSuccess={fetchDisparos}
      />

      <ModalConfirmacao
        isOpen={!!confirmExcluir}
        onClose={() => setConfirmExcluir(null)}
        onConfirm={excluirDisparo}
        title="Remover Disparo"
        message="Tem certeza que deseja excluir o histórico deste disparo? Essa ação não cancela envios já efetuados."
        loading={excluindo}
      />
    </AppLayout>
  );
}
