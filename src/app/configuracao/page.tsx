"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLayouts } from "@/hooks/useLayouts";
import { AppLayout } from "@/components/layout/AppLayout";
import { ModalLayout } from "@/components/configuracao/ModalLayout";
import { ModalUsuario } from "@/components/configuracao/ModalUsuario";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { Image, Type, Square, Pencil, Trash2, UserPlus } from "lucide-react";
import type { CrisTechLayout, CrisTechUsuario } from "@/types";

function getRoleBadge(role: string) {
  switch (role) {
    case "master":
      return (
        <span className="rounded bg-[#CC0000] px-2 py-0.5 text-xs font-medium">
          MASTER
        </span>
      );
    case "admin":
      return (
        <span className="rounded bg-amber-900/50 px-2 py-0.5 text-xs font-medium text-amber-400">
          ADMIN
        </span>
      );
    default:
      return (
        <span className="rounded bg-[#1E1E1E] px-2 py-0.5 text-xs font-medium text-[#9CA3AF]">
          COMMON
        </span>
      );
  }
}

function getTipoIcon(tipo: string) {
  switch (tipo) {
    case "imagem":
      return <Image size={14} />;
    case "checkbox":
      return <Square size={14} />;
    default:
      return <Type size={14} />;
  }
}

export default function ConfiguracaoPage() {
  const { usuario, loading: authLoading } = useAuth();
  const { layouts, loading: layoutsLoading, refetch } = useLayouts();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<CrisTechUsuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [modalLayout, setModalLayout] = useState(false);
  const [layoutEditando, setLayoutEditando] = useState<CrisTechLayout | null>(null);
  const [modalUsuario, setModalUsuario] = useState(false);

  useEffect(() => {
    if (usuario?.role === "user") {
      toast.error("Acesso negado.");
      router.push("/operacao");
      return;
    }
  }, [usuario, router]);

  useEffect(() => {
    const fetchUsuarios = async () => {
      if (usuario?.role !== "master") return;
      const { data, error } = await supabase
        .from("cris_tech_usuarios")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) setUsuarios(data ?? []);
      setLoadingUsuarios(false);
    };
    fetchUsuarios();
  }, [usuario?.role]);

  const abrirNovoLayout = () => {
    setLayoutEditando(null);
    setModalLayout(true);
  };

  const abrirEditarLayout = (l: CrisTechLayout) => {
    setLayoutEditando(l);
    setModalLayout(true);
  };

  const fecharModalLayout = () => {
    setModalLayout(false);
    setLayoutEditando(null);
    refetch();
  };

  const excluirUsuario = async (id: string) => {
    if (id === usuario?.id) return;
    const { error } = await supabase.from("cris_tech_usuarios").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir usuário.");
      return;
    }
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
    toast.success("Usuário excluído.");
  };

  const aoCriarUsuario = () => {
    setModalUsuario(false);
    setUsuarios([]);
    supabase
      .from("cris_tech_usuarios")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setUsuarios(data ?? []));
  };

  if (authLoading || (usuario?.role === "user" && !usuario)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CC0000] border-t-transparent" />
      </div>
    );
  }

  if (usuario?.role === "user") {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-10">
        {/* SEÇÃO A - Layouts */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#CC0000]">
                Gerenciamento de Layouts
              </h2>
              <p className="text-sm text-[#9CA3AF]">
                Crie e edite layouts para geração de imagens.
              </p>
            </div>
            <Button variant="primary" onClick={abrirNovoLayout}>
              + Novo Layout
            </Button>
          </div>
          {layoutsLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CC0000] border-t-transparent" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {layouts.map((l) => (
                <div
                  key={l.id}
                  className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-4"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <h3 className="font-bold uppercase text-white">{l.nome}</h3>
                    <button
                      type="button"
                      onClick={() => abrirEditarLayout(l)}
                      className="rounded p-1 text-[#9CA3AF] hover:bg-[#1E1E1E] hover:text-white"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                  <p className="mb-3 truncate text-xs text-[#9CA3AF]">
                    Webhook: {l.webhook_url}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {l.campos?.map((c) => (
                      <span
                        key={c.id}
                        className="flex items-center gap-1 rounded bg-[#1E1E1E] px-2 py-0.5 text-xs text-[#9CA3AF]"
                      >
                        {getTipoIcon(c.tipo)} {c.tipo.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SEÇÃO B - Usuários (somente master) */}
        {usuario?.role === "master" && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#CC0000]">
                  Gerenciamento de Usuários
                </h2>
                <p className="text-sm text-[#9CA3AF]">
                  Controle quem tem acesso à plataforma.
                </p>
              </div>
              <Button variant="primary" onClick={() => setModalUsuario(true)}>
                + Novo Usuário
              </Button>
            </div>
            {loadingUsuarios ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CC0000] border-t-transparent" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {usuarios.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-4 rounded-lg border border-[#1E1E1E] bg-[#111111] p-4"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1E1E1E] text-lg font-medium text-white">
                      {u.nome?.[0]?.toUpperCase() ?? u.email[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">
                        {u.nome || "Sem nome"}
                      </p>
                      <p className="truncate text-sm text-[#9CA3AF]">{u.email}</p>
                      {getRoleBadge(u.role)}
                    </div>
                    {u.id !== usuario?.id && (
                      <button
                        type="button"
                        onClick={() => excluirUsuario(u.id)}
                        className="rounded p-2 text-[#9CA3AF] hover:bg-red-900/30 hover:text-red-400"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <ModalLayout
        isOpen={modalLayout}
        onClose={fecharModalLayout}
        layout={layoutEditando}
        criadoPor={usuario?.id ?? ""}
      />
      {usuario?.role === "master" && (
        <ModalUsuario
          isOpen={modalUsuario}
          onClose={() => setModalUsuario(false)}
          onSuccess={aoCriarUsuario}
        />
      )}
    </AppLayout>
  );
}
