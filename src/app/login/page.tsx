"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError("Credenciais inválidas. Tente novamente.");
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Erro ao fazer login.");
        setLoading(false);
        return;
      }

      let { data: usuarioData, error: usuarioError } = await supabase
        .from("cris_tech_usuarios")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle();

      // Se não encontrou por ID, tentar por e-mail (ID Mismatch Fix)
      if (!usuarioData) {
        console.warn("Usuário não encontrado por ID, tentando por e-mail...");
        const { data: byEmail } = await supabase
          .from("cris_tech_usuarios")
          .select("*")
          .eq("email", authData.user.email)
          .maybeSingle();

        if (byEmail) {
          console.info("ID Mismatch detectado. Iniciando reparo automático...");

          // Chamar API de reparo (usando fetch interno)
          const repairRes = await fetch("/api/auth/repair-id", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: authData.user.email,
              authId: authData.user.id
            })
          });

          if (repairRes.ok) {
            console.info("ID reparado com sucesso!");
            usuarioData = byEmail; // Prosseguir com os dados encontrados
          } else {
            console.error("Falha ao reparar ID automaticamente.");
          }
        }
      }

      if (!usuarioData) {
        console.error("Usuário não encontrado no banco:", usuarioError);
        await supabase.auth.signOut();
        setError("Acesso não autorizado. Perfil de usuário não configurado.");
        setLoading(false);
        return;
      }

      console.log("Login bem-sucedido, redirecionando...");
      toast.success("Login realizado com sucesso!");

      // Usar window.location como fallback mais confiável
      window.location.href = "/operacao";
    } catch (err) {
      console.error("Erro no login:", err);
      setError("Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-4">
      <div className="w-full max-w-[420px] rounded-xl border border-[#1E1E1E] bg-[#111111] p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#CC0000]">Cris Tech</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-[#9CA3AF]">
              E-mail
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-[#9CA3AF]">
              Senha
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" loading={loading} className="w-full">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
