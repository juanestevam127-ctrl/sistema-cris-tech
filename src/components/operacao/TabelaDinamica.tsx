"use client";

import { useRef, useState } from "react";
import { Copy, Trash2, Pencil, X } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";
import type { CrisTechLayout, CrisTechCampo, LinhaOperacao } from "@/types";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

interface TabelaDinamicaProps {
  layout: CrisTechLayout;
  linhas: LinhaOperacao[];
  setLinhas: React.Dispatch<React.SetStateAction<LinhaOperacao[]>>;
  adicionarLinha: () => void;
}

function CelulaCheckbox({
  campo,
  valor,
  onChange,
}: {
  campo: CrisTechCampo;
  valor: string[];
  onChange: (v: string[]) => void;
}) {
  const opcoes = (campo.opcoes ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const toggle = (op: string) => {
    if (valor.includes(op)) {
      onChange(valor.filter((x) => x !== op));
    } else {
      onChange([...valor, op]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      {opcoes.map((op) => (
        <button
          key={op}
          type="button"
          onClick={() => toggle(op)}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            valor.includes(op)
              ? "bg-[#CC0000] text-white"
              : "bg-[#1E1E1E] text-[#9CA3AF] hover:bg-[#333]"
          }`}
        >
          {op}
        </button>
      ))}
    </div>
  );
}

function CelulaImagem({
  layoutId,
  valor,
  onChange,
}: {
  layoutId: string;
  valor: string | string[];
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const url = Array.isArray(valor) ? valor[0] ?? "" : valor ?? "";

  const uploadArquivo = async (file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo deve ter no máximo 5MB.");
      return;
    }
    if (!allowed.includes(file.type)) {
      toast.error("Use JPG, PNG ou WEBP.");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      toast.error("Faça login novamente.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("layoutId", layoutId);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao fazer upload.");
        return;
      }
      onChange(data.url);
      toast.success("Imagem enviada!");
    } catch (err) {
      toast.error("Erro ao fazer upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadArquivo(file);
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex h-[36px] w-[36px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#1E1E1E] bg-[#0A0A0A]">
        {url ? (
          <>
            <img src={url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center gap-0.5 bg-black/60 opacity-0 transition-opacity hover:opacity-100">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="flex h-6 w-6 items-center justify-center rounded bg-[#1E1E1E] text-white hover:bg-[#333]"
                title="Trocar imagem"
              >
                <Pencil size={12} />
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                className="flex h-6 w-6 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700"
                title="Excluir"
              >
                <X size={12} />
              </button>
            </div>
          </>
        ) : (
          <span className="text-[10px] text-[#6B7280]">
            {uploading ? "..." : "—"}
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
      {!url && (
        <Button
          variant="secondary"
          className="text-xs"
          onClick={() => inputRef.current?.click()}
          loading={uploading}
          disabled={uploading}
        >
          Upload
        </Button>
      )}
    </div>
  );
}

export function TabelaDinamica({
  layout,
  linhas,
  setLinhas,
  adicionarLinha,
}: TabelaDinamicaProps) {
  const campos = layout.campos ?? [];
  const ordenados = [...campos].sort((a, b) => a.ordem - b.ordem);

  const atualizarLinha = (id: string, campo: string, valor: string | string[]) => {
    setLinhas((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, dados: { ...l.dados, [campo]: valor } } : l
      )
    );
  };

  const duplicar = (linha: LinhaOperacao) => {
    setLinhas((prev) => [
      ...prev,
      { id: crypto.randomUUID(), dados: { ...linha.dados } },
    ]);
  };

  const excluir = (id: string) => {
    setLinhas((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-[#1E1E1E] bg-[#111111]">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b border-[#1E1E1E]">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">
              #
            </th>
            {ordenados.map((c) => (
              <th
                key={c.id}
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]"
              >
                {c.nome}
              </th>
            ))}
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#9CA3AF]">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, idx) => (
            <tr key={linha.id} className="border-b border-[#1E1E1E] last:border-0">
              <td className="px-4 py-3 text-sm text-[#9CA3AF]">{idx + 1}</td>
              {ordenados.map((c) => (
                <td key={c.id} className="px-4 py-2">
                  {c.tipo === "texto" && (
                    <input
                      type="text"
                      value={(linha.dados[c.nome] as string) ?? ""}
                      onChange={(e) =>
                        atualizarLinha(linha.id, c.nome, e.target.value)
                      }
                      placeholder="Digite..."
                      className="w-full min-w-[120px] rounded border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1.5 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:ring-1 focus:ring-[#CC0000]"
                    />
                  )}
                  {c.tipo === "imagem" && (
                    <CelulaImagem
                      layoutId={layout.id}
                      valor={
                        Array.isArray(linha.dados[c.nome])
                          ? (linha.dados[c.nome] as string[])[0] ?? ""
                          : (linha.dados[c.nome] as string) ?? ""
                      }
                      onChange={(v) => atualizarLinha(linha.id, c.nome, v)}
                    />
                  )}
                  {c.tipo === "checkbox" && (
                    <CelulaCheckbox
                      campo={c}
                      valor={
                        Array.isArray(linha.dados[c.nome])
                          ? (linha.dados[c.nome] as string[])
                          : []
                      }
                      onChange={(v) => atualizarLinha(linha.id, c.nome, v)}
                    />
                  )}
                </td>
              ))}
              <td className="px-4 py-2">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => duplicar(linha)}
                    className="rounded p-1.5 text-[#9CA3AF] hover:bg-[#1E1E1E] hover:text-white"
                    title="Duplicar"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => excluir(linha.id)}
                    className="rounded p-1.5 text-[#9CA3AF] hover:bg-red-900/30 hover:text-red-400"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-[#1E1E1E] p-3">
        <Button variant="secondary" onClick={adicionarLinha}>
          + Adicionar Linha
        </Button>
      </div>
    </div>
  );
}
