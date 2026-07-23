"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, Save } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ClienteDisparo {
  id?: string;
  nome: string;
  telefone: string;
}

interface ModalClienteDisparoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cliente: ClienteDisparo | null;
}

export function ModalClienteDisparo({
  isOpen,
  onClose,
  onSuccess,
  cliente,
}: ModalClienteDisparoProps) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (cliente) {
        setNome(cliente.nome);
        setTelefone(cliente.telefone);
      } else {
        setNome("");
        setTelefone("");
      }
    }
  }, [isOpen, cliente]);

  if (!isOpen) return null;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }

    setSalvando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (cliente?.id) {
        // Editar
        const { error } = await supabase
          .from("cris_tech_clientes_disparo")
          .update({
            nome: nome.trim(),
            telefone: telefone.trim(),
          })
          .eq("id", cliente.id);

        if (error) throw error;
        toast.success("Cliente de disparo atualizado!");
      } else {
        // Criar
        const { error } = await supabase
          .from("cris_tech_clientes_disparo")
          .insert({
            nome: nome.trim(),
            telefone: telefone.trim(),
            criado_por: userId || null,
          });

        if (error) throw error;
        toast.success("Cliente de disparo cadastrado!");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar cliente.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-[#1E1E1E] bg-[#111111] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E1E1E] px-6 py-4 bg-[#0D0D0D]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserPlus size={18} className="text-[#CC0000]" />
            {cliente ? "Editar Cliente de Disparo" : "Novo Cliente de Disparo"}
          </h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSalvar}>
          <div className="p-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Nome do Cliente
              </label>
              <Input
                type="text"
                placeholder="Ex: João Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Telefone / Celular
              </label>
              <Input
                type="text"
                placeholder="Ex: 5511999999999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                required
              />
              <p className="text-[10px] text-[#6B7280] mt-1">
                Insira o número com DDI (55), DDD e número sem traços ou espaços.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-[#1E1E1E] px-6 py-4 bg-[#0D0D0D]">
            <Button
              variant="ghost"
              type="button"
              onClick={onClose}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={salvando}
              className="flex items-center gap-2"
            >
              <Save size={16} />
              {cliente ? "Salvar Alterações" : "Cadastrar Cliente"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
