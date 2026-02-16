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

      // 2. Verificar usuário no banco via API (ignora RLS do cliente e auto-repara ID se necessário)
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authData.user.email,
          authId: authData.user.id
        })
      });

      if (!verifyRes.ok) {
        const verifyData = await verifyRes.json();
        console.error("Erro na verificação do banco:", verifyData.error);
        await supabase.auth.signOut();
        setError(verifyData.error || "Perfil não configurado.");
        setLoading(false);
        return;
      }

      console.log("Login verificado e sincronizado, redirecionando...");
      toast.success("Login realizado com sucesso!");
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
