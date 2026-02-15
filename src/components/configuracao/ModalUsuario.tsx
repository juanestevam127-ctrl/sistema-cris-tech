"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

interface ModalUsuarioProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModalUsuario({ isOpen, onClose, onSuccess }: ModalUsuarioProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Faça login novamente.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          nome: nome.trim() || null,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao criar usuário.");
      }
      toast.success("Usuário criado!");
      setNome("");
      setEmail("");
      setPassword("");
      setRole("user");
      onSuccess();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar usuário.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Usuário">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">
            NOME (OPCIONAL)
          </label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: João Silva"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">
            EMAIL *
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">
            SENHA *
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">
            PERMISSÃO *
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "user" | "admin")}
            className="w-full rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
          >
            <option value="user">Comum (Apenas Uso)</option>
            <option value="admin">Admin (Acesso Total)</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Cadastrar Usuário
          </Button>
        </div>
      </form>
    </Modal>
  );
}
