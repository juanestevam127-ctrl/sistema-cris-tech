"use client";

import { useState, useRef } from "react";
import { X, Upload, Send, MessageSquare, Image as ImageIcon, Loader2, Users } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";

interface ModalDisparoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModalDisparo({ isOpen, onClose, onSuccess }: ModalDisparoProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<"texto" | "texto_imagem" | "imagem">("texto");
  const [texto, setTexto] = useState("");
  const [imagemUrl, setImagemUrl] = useState("");
  const [destinatario, setDestinatario] = useState<"grupo" | "clientes">("grupo");
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [agendamentoTipo, setAgendamentoTipo] = useState<"agora" | "agendado">("agora");
  const [dataHoraAgendamento, setDataHoraAgendamento] = useState("");

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 10MB.");
      return;
    }

    setUploadingImage(true);
    try {
      const BUCKET = "cris-tech-images";
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `uploads/disparos/${Date.now()}_${safeName}`;

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw new Error(error.message || "Erro no upload.");
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setImagemUrl(urlData.publicUrl);
      toast.success("Imagem enviada!");
    } catch (err: any) {
      toast.error(`Falha no upload: ${err.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const validarHorarioDisparo = async (targetTime: Date): Promise<boolean> => {
    // 1. Validar se é a partir do meio-dia (12:00)
    const hours = targetTime.getHours();
    if (hours < 12) {
      toast.error("Disparos só podem ser realizados ou agendados a partir do meio-dia (12:00).");
      return false;
    }

    // 2. Validar intervalo de 3 horas
    try {
      const { data: existing, error } = await supabase
        .from("cris_tech_disparos")
        .select("agendado_para")
        .neq("status", "erro");

      if (error) throw error;

      if (existing && existing.length > 0) {
        const targetMs = targetTime.getTime();
        const threeHoursMs = 3 * 60 * 60 * 1000;

        const conflito = existing.find((d) => {
          if (!d.agendado_para) return false;
          const diff = Math.abs(new Date(d.agendado_para).getTime() - targetMs);
          return diff < threeHoursMs;
        });

        if (conflito) {
          toast.error("O intervalo mínimo obrigatório entre disparos é de 3 horas. Escolha outro horário.");
          return false;
        }
      }
    } catch (err) {
      console.error("Erro na validação de intervalo:", err);
    }
    return true;
  };

  const handleSalvar = async () => {
    if (tipo !== "imagem" && !texto.trim()) {
      toast.error("Escreva uma mensagem antes de salvar.");
      return;
    }
    if (tipo !== "texto" && !imagemUrl) {
      toast.error("Suba uma imagem para o disparo.");
      return;
    }

    const targetTime = agendamentoTipo === "agora" ? new Date() : new Date(dataHoraAgendamento);
    const valid = await validarHorarioDisparo(targetTime);
    if (!valid) return;

    setSalvando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { error } = await supabase
        .from("cris_tech_disparos")
        .insert({
          tipo,
          texto: tipo === "imagem" ? null : texto.trim(),
          imagem_url: tipo !== "texto" ? imagemUrl : null,
          destinatario,
          status: "pendente",
          agendado_para: targetTime.toISOString(),
          criado_por: userId || null,
        });

      if (error) throw error;

      toast.success("Rascunho do disparo salvo!");
      setTexto("");
      setImagemUrl("");
      setDataHoraAgendamento("");
      setAgendamentoTipo("agora");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar rascunho.");
    } finally {
      setSalvando(false);
    }
  };

  const handleDisparar = async () => {
    if (tipo !== "imagem" && !texto.trim()) {
      toast.error("Escreva uma mensagem antes de disparar.");
      return;
    }
    if (tipo !== "texto" && !imagemUrl) {
      toast.error("Suba uma imagem para o disparo.");
      return;
    }
    if (agendamentoTipo === "agendado" && !dataHoraAgendamento) {
      toast.error("Informe a data e hora do agendamento.");
      return;
    }

    const targetTime = agendamentoTipo === "agora" ? new Date() : new Date(dataHoraAgendamento);
    const valid = await validarHorarioDisparo(targetTime);
    if (!valid) return;

    setEnviando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // 1. Salvar no banco
      const { error: dbError } = await supabase
        .from("cris_tech_disparos")
        .insert({
          tipo,
          texto: tipo === "imagem" ? null : texto.trim(),
          imagem_url: tipo !== "texto" ? imagemUrl : null,
          destinatario,
          status: "pendente",
          agendado_para: targetTime.toISOString(),
          criado_por: userId || null,
        });

      if (dbError) throw dbError;

      // 2. Se for para disparar agora, executa imediatamente
      if (agendamentoTipo === "agora") {
        const triggerRes = await fetch("/api/cron/process-dispatches");
        const triggerData = await triggerRes.json();
        
        if (!triggerRes.ok) {
          throw new Error(triggerData.error ?? "Erro ao processar disparo imediato.");
        }
        
        toast.success("Disparo enviado com sucesso!");
      } else {
        toast.success("Disparo agendado com sucesso!");
      }

      setTexto("");
      setImagemUrl("");
      setDataHoraAgendamento("");
      setAgendamentoTipo("agora");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao realizar disparo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-[#1E1E1E] bg-[#111111] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E1E1E] px-6 py-4 bg-[#0D0D0D]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Send size={18} className="text-[#CC0000]" />
            Criar Disparo de Mensagens
          </h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Tipo de Disparo */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Formato de Disparo
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setTipo("texto"); setImagemUrl(""); }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 font-semibold border transition ${
                  tipo === "texto"
                    ? "bg-[#1E1E1E] text-white border-[#CC0000]"
                    : "bg-[#0A0A0A] text-[#9CA3AF] border-[#1E1E1E] hover:border-[#333]"
                }`}
              >
                <MessageSquare size={14} /> Texto
              </button>
              <button
                type="button"
                onClick={() => setTipo("texto_imagem")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 font-semibold border transition ${
                  tipo === "texto_imagem"
                    ? "bg-[#1E1E1E] text-white border-[#CC0000]"
                    : "bg-[#0A0A0A] text-[#9CA3AF] border-[#1E1E1E] hover:border-[#333]"
                }`}
              >
                <ImageIcon size={14} /> Texto + Img
              </button>
              <button
                type="button"
                onClick={() => { setTipo("imagem"); setTexto(""); }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 font-semibold border transition ${
                  tipo === "imagem"
                    ? "bg-[#1E1E1E] text-white border-[#CC0000]"
                    : "bg-[#0A0A0A] text-[#9CA3AF] border-[#1E1E1E] hover:border-[#333]"
                }`}
              >
                <ImageIcon size={14} /> Apenas Img
              </button>
            </div>
          </div>

          {/* Destinatário (Destino) */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Destino do Disparo
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDestinatario("grupo")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 font-semibold border transition ${
                  destinatario === "grupo"
                    ? "bg-[#1E1E1E] text-white border-[#CC0000]"
                    : "bg-[#0A0A0A] text-[#9CA3AF] border-[#1E1E1E] hover:border-[#333]"
                }`}
              >
                <Users size={16} /> Disparar para Grupos
              </button>
              <button
                type="button"
                onClick={() => setDestinatario("clientes")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 font-semibold border transition ${
                  destinatario === "clientes"
                    ? "bg-[#1E1E1E] text-white border-[#CC0000]"
                    : "bg-[#0A0A0A] text-[#9CA3AF] border-[#1E1E1E] hover:border-[#333]"
                }`}
              >
                <Users size={16} /> Disparar para Clientes
              </button>
            </div>
          </div>

          {/* Imagem (Se for texto + imagem ou apenas imagem) */}
          {tipo !== "texto" && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Selecione a Imagem
              </label>
              
              <div className="flex items-center gap-4">
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0A0A0A] border border-[#1E1E1E]">
                  {imagemUrl ? (
                    <img src={imagemUrl} alt="Disparo" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-1">
                      {uploadingImage ? (
                        <Loader2 size={18} className="animate-spin text-[#CC0000]" />
                      ) : (
                        <span className="text-[10px] text-[#6B7280]">Sem imagem</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      type="button"
                      className="text-xs py-1 px-3 h-9"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      {imagemUrl ? "Alterar Imagem" : "Selecionar Imagem"}
                    </Button>
                    {imagemUrl && (
                      <Button
                        variant="ghost"
                        type="button"
                        className="text-xs py-1 px-3 h-9 text-red-400 border border-red-900/30"
                        onClick={() => setImagemUrl("")}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-[#6B7280]">Use arquivos PNG, JPG ou WEBP de até 10MB.</p>
                </div>
              </div>
            </div>
          )}

          {/* Área de Texto */}
          {tipo !== "imagem" && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Mensagem do Disparo
              </label>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Digite a mensagem para enviar..."
                rows={6}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
              />
            </div>
          )}

          {/* Tipo de Envio / Agendamento */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Tipo de Envio
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAgendamentoTipo("agora")}
                className={`rounded-lg py-2 border transition font-semibold text-sm ${
                  agendamentoTipo === "agora"
                    ? "bg-[#1E1E1E] text-white border-[#CC0000]"
                    : "bg-[#0A0A0A] text-[#9CA3AF] border-[#1E1E1E] hover:border-[#333]"
                }`}
              >
                Disparar Agora
              </button>
              <button
                type="button"
                onClick={() => setAgendamentoTipo("agendado")}
                className={`rounded-lg py-2 border transition font-semibold text-sm ${
                  agendamentoTipo === "agendado"
                    ? "bg-[#1E1E1E] text-white border-[#CC0000]"
                    : "bg-[#0A0A0A] text-[#9CA3AF] border-[#1E1E1E] hover:border-[#333]"
                }`}
              >
                Agendar Horário
              </button>
            </div>
          </div>

          {/* Datetime selector */}
          {agendamentoTipo === "agendado" && (
            <div className="animate-in slide-in-from-top-3 duration-200">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Data e Hora de Agendamento
              </label>
              <input
                type="datetime-local"
                value={dataHoraAgendamento}
                onChange={(e) => setDataHoraAgendamento(e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
              />
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[#1E1E1E] px-6 py-4 bg-[#0D0D0D]">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={enviando || salvando || uploadingImage}
          >
            Cancelar
          </Button>
          <Button
            variant="secondary"
            onClick={handleSalvar}
            loading={salvando}
            disabled={enviando || uploadingImage || (tipo !== "imagem" && !texto.trim())}
          >
            Salvar Rascunho
          </Button>
          <Button
            variant="primary"
            onClick={handleDisparar}
            loading={enviando}
            disabled={salvando || uploadingImage || (tipo !== "imagem" && !texto.trim())}
          >
            {agendamentoTipo === "agora" ? "Disparar Mensagem" : "Agendar Disparo"}
          </Button>
        </div>

      </div>
    </div>
  );
}
