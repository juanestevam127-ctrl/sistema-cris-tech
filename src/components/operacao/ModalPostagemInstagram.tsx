"use client";

import { useState, useRef } from "react";
import { X, Upload, Film, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";

interface ModalPostagemInstagramProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UploadingFile {
  name: string;
  progress: number;
  url?: string;
  error?: boolean;
}

export function ModalPostagemInstagram({ isOpen, onClose }: ModalPostagemInstagramProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tipoPublicacao, setTipoPublicacao] = useState<"feed" | "stories">("feed");
  const [tipoMidiaFeed, setTipoMidiaFeed] = useState<"imagem_estatica" | "carrossel" | "reels">("imagem_estatica");
  const [tipoMidiaStories, setTipoMidiaStories] = useState<"imagem" | "video">("imagem");
  
  const [legenda, setLegenda] = useState("");
  const [agendamentoTipo, setAgendamentoTipo] = useState<"agora" | "agendado">("agora");
  const [dataHoraAgendamento, setDataHoraAgendamento] = useState("");
  
  const [arquivosUpload, setArquivosUpload] = useState<UploadingFile[]>([]);
  const [enviandoWebhook, setEnviandoWebhook] = useState(false);

  if (!isOpen) return null;

  const isStories = tipoPublicacao === "stories";
  const isCarrossel = !isStories && tipoMidiaFeed === "carrossel";
  const isVideoOnly = (isStories && tipoMidiaStories === "video") || (!isStories && tipoMidiaFeed === "reels");
  const isImageOnly = (isStories && tipoMidiaStories === "imagem") || (!isStories && tipoMidiaFeed === "imagem_estatica");

  const getMediaLimitsAndAccept = () => {
    if (isStories) {
      return {
        maxFiles: 1,
        accept: tipoMidiaStories === "video" ? "video/*" : "image/*",
        label: tipoMidiaStories === "video" ? "1 Vídeo" : "1 Imagem",
      };
    }
    if (tipoMidiaFeed === "reels") {
      return { maxFiles: 1, accept: "video/*", label: "1 Vídeo" };
    }
    if (tipoMidiaFeed === "imagem_estatica") {
      return { maxFiles: 1, accept: "image/*", label: "1 Imagem" };
    }
    return { maxFiles: 10, accept: "image/*", label: "Até 10 Imagens" };
  };

  const { maxFiles, accept, label } = getMediaLimitsAndAccept();

  const uploadFile = async (file: File, index: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("layoutId", "instagram");

      setArquivosUpload((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], progress: 10 };
        return copy;
      });

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao fazer upload.");
      }

      setArquivosUpload((prev) => {
        const copy = [...prev];
        copy[index] = { name: file.name, progress: 100, url: data.url };
        return copy;
      });
    } catch (err: any) {
      toast.error(`Falha no upload de ${file.name}: ${err.message}`);
      setArquivosUpload((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], progress: 0, error: true };
        return copy;
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    if (files.length > maxFiles) {
      toast.error(`Você só pode selecionar no máximo ${maxFiles} arquivos para este formato.`);
      return;
    }

    // Reset upload state
    const newFilesList: UploadingFile[] = files.map((f) => ({
      name: f.name,
      progress: 0,
    }));
    setArquivosUpload(newFilesList);

    // Trigger sequential or parallel uploads
    files.forEach((file, idx) => {
      uploadFile(file, idx);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoverArquivo = (index: number) => {
    setArquivosUpload((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEnviar = async () => {
    if (arquivosUpload.length === 0) {
      toast.error("Selecione e envie pelo menos um arquivo.");
      return;
    }

    const aindaCarregando = arquivosUpload.some((f) => f.progress < 100 && !f.error);
    if (aindaCarregando) {
      toast.error("Aguarde a conclusão de todos os uploads.");
      return;
    }

    const urlsValidas = arquivosUpload.map((f) => f.url).filter((url): url is string => !!url);
    if (urlsValidas.length === 0) {
      toast.error("Nenhum arquivo enviado com sucesso.");
      return;
    }

    if (agendamentoTipo === "agendado" && !dataHoraAgendamento) {
      toast.error("Informe a data e hora do agendamento.");
      return;
    }

    setEnviandoWebhook(true);
    try {
      const dataAgendamento = agendamentoTipo === "agora" ? new Date().toISOString() : new Date(dataHoraAgendamento).toISOString();
      
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // 1. Salvar no banco de dados do Supabase
      const { error: dbError } = await supabase
        .from("cris_tech_postagens_agendadas")
        .insert({
          tipo_publicacao: tipoPublicacao,
          tipo_midia: isStories ? tipoMidiaStories : tipoMidiaFeed,
          legenda: legenda || null,
          midias: urlsValidas,
          agendado_para: dataAgendamento,
          status: "pendente",
          criado_por: userId || null,
        });

      if (dbError) throw dbError;

      // 2. Se for para postar agora, dispara imediatamente através do nosso endpoint de cron
      if (agendamentoTipo === "agora") {
        const triggerRes = await fetch("/api/cron/process-posts");
        const triggerData = await triggerRes.json();
        
        if (!triggerRes.ok) {
          throw new Error(triggerData.error ?? "Erro ao processar postagem imediata.");
        }
        
        toast.success("Postagem enviada com sucesso!");
      } else {
        toast.success("Postagem agendada com sucesso!");
      }

      // Reset states
      setLegenda("");
      setArquivosUpload([]);
      setDataHoraAgendamento("");
      setAgendamentoTipo("agora");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar postagem.");
      console.error(err);
    } finally {
      setEnviandoWebhook(false);
    }
  };

  const handleResetType = (pubType: "feed" | "stories") => {
    setTipoPublicacao(pubType);
    setArquivosUpload([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-[#1E1E1E] bg-[#111111] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E1E1E] px-6 py-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            📸 Postagem / Agendamento no Instagram
          </h2>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] transition hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5 text-sm text-[#9CA3AF]">
          
          {/* Tipo de Publicação */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white">
              Tipo de Publicação
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleResetType("feed")}
                className={`rounded-lg py-2.5 font-semibold border transition-all ${
                  tipoPublicacao === "feed"
                    ? "bg-[#CC0000] text-white border-[#CC0000]"
                    : "bg-[#0A0A0A] text-[#9CA3AF] border-[#1E1E1E] hover:border-[#333]"
                }`}
              >
                Feed
              </button>
              <button
                type="button"
                onClick={() => handleResetType("stories")}
                className={`rounded-lg py-2.5 font-semibold border transition-all ${
                  tipoPublicacao === "stories"
                    ? "bg-[#CC0000] text-white border-[#CC0000]"
                    : "bg-[#0A0A0A] text-[#9CA3AF] border-[#1E1E1E] hover:border-[#333]"
                }`}
              >
                Stories
              </button>
            </div>
          </div>

          {/* Formato de Mídia */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white">
              Formato de Mídia
            </label>
            {isStories ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setTipoMidiaStories("imagem"); setArquivosUpload([]); }}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 border transition ${
                    tipoMidiaStories === "imagem"
                      ? "bg-[#1E1E1E] text-white border-[#CC0000]"
                      : "bg-[#0A0A0A] text-[#9CA3AF] border-[#1E1E1E] hover:border-[#333]"
                  }`}
                >
                  <ImageIcon size={16} /> Imagem
                </button>
                <button
                  type="button"
                  onClick={() => { setTipoMidiaStories("video"); setArquivosUpload([]); }}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 border transition ${
                    tipoMidiaStories === "video"
                      ? "bg-[#1E1E1E] text-white border-[#CC0000]"
                      : "bg-[#0A0A0A] text-[#9CA3AF] border-[#1E1E1E] hover:border-[#333]"
                  }`}
                >
                  <Film size={16} /> Vídeo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setTipoMidiaFeed("imagem_estatica"); setArquivosUpload([]); }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 border text-xs sm:text-sm transition ${
                    tipoMidiaFeed === "imagem_estatica"
                      ? "bg-[#1E1E1E] text-white border-[#CC0000]"
                      : "bg-[#0A0A0A] text-[#9CA3AF] border-[#1E1E1E] hover:border-[#333]"
                  }`}
                >
                  <ImageIcon size={16} /> Imagem Estática
                </button>
                <button
                  type="button"
                  onClick={() => { setTipoMidiaFeed("carrossel"); setArquivosUpload([]); }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 border text-xs sm:text-sm transition ${
                    tipoMidiaFeed === "carrossel"
                      ? "bg-[#1E1E1E] text-white border-[#CC0000]"
                      : "bg-[#0A0A0A] text-[#9CA3AF] border-[#1E1E1E] hover:border-[#333]"
                  }`}
                >
                  🗂️ Carrossel
                </button>
                <button
                  type="button"
                  onClick={() => { setTipoMidiaFeed("reels"); setArquivosUpload([]); }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 border text-xs sm:text-sm transition ${
                    tipoMidiaFeed === "reels"
                      ? "bg-[#1E1E1E] text-white border-[#CC0000]"
                      : "bg-[#0A0A0A] text-[#9CA3AF] border-[#1E1E1E] hover:border-[#333]"
                  }`}
                >
                  <Film size={16} /> Reels
                </button>
              </div>
            )}
          </div>

          {/* Upload de Mídias */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white">
              Enviar Arquivos ({label})
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#2A2A2A] bg-[#0A0A0A] py-8 text-center transition hover:border-[#CC0000] hover:bg-[#111111]"
            >
              <Upload size={32} className="mb-2 text-[#9CA3AF]" />
              <p className="font-semibold text-white">Selecione arquivos</p>
              <p className="text-xs text-[#6B7280]">
                Arraste ou clique para enviar ({label})
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                multiple={isCarrossel}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Upload list */}
            {arquivosUpload.length > 0 && (
              <div className="mt-3 space-y-2">
                {arquivosUpload.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2"
                  >
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="truncate text-xs font-medium text-white">{file.name}</p>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#1E1E1E]">
                        <div
                          className={`h-full transition-all duration-300 ${
                            file.error ? "bg-red-600" : "bg-[#CC0000]"
                          }`}
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#6B7280]">
                        {file.error ? "Erro" : file.progress === 100 ? "Pronto" : `${file.progress}%`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoverArquivo(idx)}
                        className="text-[#6B7280] hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legenda (Caption) */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white">
              Legenda / Texto da Publicação
            </label>
            <textarea
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
              placeholder="Escreva a legenda aqui..."
              rows={4}
              className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2 text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
            />
          </div>

          {/* Tipo de Agendamento */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white">
              Tipo de Disparo
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAgendamentoTipo("agora")}
                className={`rounded-lg py-2 border transition ${
                  agendamentoTipo === "agora"
                    ? "bg-[#1E1E1E] text-white border-[#CC0000]"
                    : "bg-[#0A0A0A] text-[#9CA3AF] border-[#1E1E1E] hover:border-[#333]"
                }`}
              >
                Postar Agora
              </button>
              <button
                type="button"
                onClick={() => setAgendamentoTipo("agendado")}
                className={`rounded-lg py-2 border transition ${
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
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white">
                Data e Hora de Agendamento
              </label>
              <input
                type="datetime-local"
                value={dataHoraAgendamento}
                onChange={(e) => setDataHoraAgendamento(e.target.value)}
                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
              />
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[#1E1E1E] px-6 py-4 bg-[#0D0D0D]">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={enviandoWebhook}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleEnviar}
            loading={enviandoWebhook}
            disabled={arquivosUpload.length === 0}
          >
            {agendamentoTipo === "agora" ? "Publicar no Instagram" : "Agendar Publicação"}
          </Button>
        </div>

      </div>
    </div>
  );
}
