"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Type, Image, Square, ChevronUp, ChevronDown, X } from "lucide-react";
import toast from "react-hot-toast";
import type { CrisTechLayout, CrisTechCampo, TipoCampo } from "@/types";

interface CampoEdit {
  id: string;
  nome: string;
  tipo: TipoCampo;
  opcoes: string;
  ordem: number;
  obrigatorio: boolean;
}

interface ModalLayoutProps {
  isOpen: boolean;
  onClose: () => void;
  layout: CrisTechLayout | null;
  criadoPor: string;
}

export function ModalLayout({
  isOpen,
  onClose,
  layout,
  criadoPor,
}: ModalLayoutProps) {
  const [nome, setNome] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [descricao, setDescricao] = useState("");
  const [campos, setCampos] = useState<CampoEdit[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (layout) {
      setNome(layout.nome);
      setWebhookUrl(layout.webhook_url);
      setDescricao(layout.descricao ?? "");
      setCampos(
        (layout.campos ?? []).map((c) => ({
          id: c.id,
          nome: c.nome,
          tipo: c.tipo,
          opcoes: c.opcoes ?? "",
          ordem: c.ordem,
          obrigatorio: c.obrigatorio ?? false,
        }))
      );
    } else {
      setNome("");
      setWebhookUrl("");
      setDescricao("");
      setCampos([]);
    }
  }, [isOpen, layout]);

  const adicionarCampo = (tipo: TipoCampo) => {
    setCampos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nome: "",
        tipo,
        opcoes: tipo === "checkbox" ? "Stories, Feed" : "",
        ordem: prev.length,
        obrigatorio: false,
      },
    ]);
  };

  const removerCampo = (id: string) => {
    setCampos((prev) => prev.filter((c) => c.id !== id));
  };

  const moverCampo = (idx: number, dir: number) => {
    const novo = [...campos];
    const alvo = idx + dir;
    if (alvo < 0 || alvo >= novo.length) return;
    [novo[idx], novo[alvo]] = [novo[alvo], novo[idx]];
    setCampos(novo.map((c, i) => ({ ...c, ordem: i })));
  };

  const atualizarCampo = (
    id: string,
    field: keyof CampoEdit,
    value: string | number | boolean
  ) => {
    setCampos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const validarUrl = (url: string) => {
    try {
      const u = new URL(url);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  const salvarLayout = async () => {
    if (!nome.trim() || !webhookUrl.trim()) {
      toast.error("Preencha nome e webhook.");
      return;
    }
    if (!validarUrl(webhookUrl)) {
      toast.error("Webhook URL inválida (use http/https).");
      return;
    }
    setSalvando(true);
    try {
      if (layout) {
        await supabase
          .from("cris_tech_layouts")
          .update({
            nome: nome.trim(),
            webhook_url: webhookUrl.trim(),
            descricao: descricao.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", layout.id);
        await supabase.from("cris_tech_campos").delete().eq("layout_id", layout.id);
      }

      let layoutId = layout?.id;
      if (!layoutId) {
        const { data, error } = await supabase
          .from("cris_tech_layouts")
          .insert({
            nome: nome.trim(),
            webhook_url: webhookUrl.trim(),
            descricao: descricao.trim() || null,
            criado_por: criadoPor,
          })
          .select("id")
          .single();
        if (error || !data) throw new Error("Erro ao criar layout");
        layoutId = data.id;
      }

      const inserts = campos
        .filter((c) => c.nome.trim())
        .map((c, i) => ({
          layout_id: layoutId,
          nome: c.nome.trim(),
          tipo: c.tipo,
          opcoes: c.tipo === "checkbox" ? c.opcoes.trim() : null,
          ordem: i,
          obrigatorio: c.obrigatorio,
        }));

      if (inserts.length > 0) {
        const { error } = await supabase.from("cris_tech_campos").insert(inserts);
        if (error) throw error;
      }

      toast.success("Layout salvo com sucesso!");
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar layout.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={layout ? "Editar Layout" : "Novo Layout"}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">
            NOME DO LAYOUT *
          </label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Post Instagram"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">
            WEBHOOK URL *
          </label>
          <Input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">
            DESCRIÇÃO (OPCIONAL)
          </label>
          <Textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={2}
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-[#9CA3AF]">
            Estrutura da Tabela:
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="gap-1 text-xs"
              onClick={() => adicionarCampo("texto")}
            >
              <Type size={14} /> Texto
            </Button>
            <Button
              variant="secondary"
              className="gap-1 text-xs"
              onClick={() => adicionarCampo("imagem")}
            >
              <Image size={14} /> Imagem
            </Button>
            <Button
              variant="secondary"
              className="gap-1 text-xs"
              onClick={() => adicionarCampo("checkbox")}
            >
              <Square size={14} /> Checkbox
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-[#9CA3AF]">
            Lista de campos:
          </p>
          <div className="space-y-2">
            {campos.map((c, idx) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-2"
              >
                <span className="rounded bg-[#1E1E1E] px-2 py-0.5 text-xs">
                  {c.tipo.toUpperCase()}
                </span>
                <input
                  type="text"
                  value={c.nome}
                  onChange={(e) => atualizarCampo(c.id, "nome", e.target.value)}
                  placeholder="Nome do campo"
                  className="flex-1 min-w-[100px] rounded border border-[#1E1E1E] bg-[#111111] px-2 py-1 text-sm"
                />
                {c.tipo === "checkbox" && (
                  <input
                    type="text"
                    value={c.opcoes}
                    onChange={(e) =>
                      atualizarCampo(c.id, "opcoes", e.target.value)
                    }
                    placeholder="Opções: Stories, Feed"
                    className="w-40 rounded border border-[#1E1E1E] bg-[#111111] px-2 py-1 text-sm"
                  />
                )}
                <div className="flex gap-0">
                  <button
                    type="button"
                    onClick={() => moverCampo(idx, -1)}
                    className="rounded p-1 text-[#9CA3AF] hover:bg-[#1E1E1E]"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moverCampo(idx, 1)}
                    className="rounded p-1 text-[#9CA3AF] hover:bg-[#1E1E1E]"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removerCampo(c.id)}
                    className="rounded p-1 text-red-500 hover:bg-red-900/30"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={salvarLayout} loading={salvando}>
            Salvar Layout
          </Button>
        </div>
      </div>
    </Modal>
  );
}
