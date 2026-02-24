"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ModalCliente } from "@/components/manutencao/ModalCliente";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { Pencil } from "lucide-react";
import type { CrisTechCliente, CrisTechOS, CrisTechOrcamento } from "@/types";
import { formatPhone, formatCpfCnpj, formatCurrency, formatDate } from "@/lib/utils";

const IMAGEM_OS_COLORS: Record<string, string> = {
  pendente: "bg-[#374151] text-[#9CA3AF]",
  gerando: "bg-amber-900/40 text-amber-400",
  concluida: "bg-green-900/40 text-green-400",
  erro: "bg-red-900/40 text-red-400",
};

const STATUS_ORC_COLORS: Record<string, string> = {
  pendente: "bg-[#F59E0B]",
  aprovado: "bg-[#22C55E]",
  recusado: "bg-[#CC0000]",
  expirado: "bg-[#6B7280]",
};

export default function ClientePerfilPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { usuario } = useAuth();
  const [cliente, setCliente] = useState<CrisTechCliente | null>(null);
  const [ordens, setOrdens] = useState<CrisTechOS[]>([]);
  const [orcamentos, setOrcamentos] = useState<CrisTechOrcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<"os" | "orcamentos">("os");
  const [modalCliente, setModalCliente] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: c } = await supabase
        .from("cris_tech_clientes")
        .select("*")
        .eq("id", id)
        .single();
      if (!c) {
        setLoading(false);
        return;
      }
      setCliente(c as CrisTechCliente);

      const { data: os } = await supabase
        .from("cris_tech_ordens_servico")
        .select("*")
        .eq("cliente_nome", c.nome)
        .order("created_at", { ascending: false });
      setOrdens((os as CrisTechOS[]) ?? []);

      const { data: orc } = await supabase
        .from("cris_tech_orcamentos")
        .select("*, cris_tech_orcamento_itens(*)")
        .eq("cliente_id", id)
        .order("data_emissao", { ascending: false });
      setOrcamentos((orc as CrisTechOrcamento[]) ?? []);

      setLoading(false);
    };
    load();
  }, [id]);

  const totalOS = ordens.length;
  const ultimaOS = ordens[0];
  const totalOrcamentos = orcamentos.length;

  const totalOrcamento = (o: CrisTechOrcamento) => {
    const itens = (o as unknown as { cris_tech_orcamento_itens?: { valor_total: number }[] })
      ?.cris_tech_orcamento_itens ?? (o.itens ?? []);
    return itens.reduce((s: number, i: { valor_total: number }) => s + (i.valor_total ?? 0), 0);
  };

  if (loading || !cliente) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CC0000] border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-white truncate">{cliente.nome}</h1>
          <Button
            variant="secondary"
            className="w-full sm:w-auto gap-2"
            onClick={() => setModalCliente(true)}
          >
            <Pencil size={16} />
            Editar
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-white">Dados do cliente</h2>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${cliente.tipo === "pessoa_fisica"
                    ? "bg-[#1E1E1E] text-[#9CA3AF]"
                    : "bg-amber-900/30 text-amber-400"
                    }`}
                >
                  {cliente.tipo === "pessoa_fisica" ? "PF" : "PJ"}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-[#9CA3AF]">
                  CPF/CNPJ: {formatCpfCnpj(cliente.cpf_cnpj) || "—"}
                </p>
                <p className="text-[#9CA3AF]">Email: {cliente.email || "—"}</p>
                <p className="text-[#9CA3AF]">
                  Tel: {formatPhone(cliente.telefone) || "—"}
                </p>
                <p className="text-[#9CA3AF]">
                  Cel: {formatPhone(cliente.celular) || "—"}
                </p>
                <p className="text-[#9CA3AF]">
                  {[cliente.endereco, cliente.numero, cliente.bairro]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
                <p className="text-[#9CA3AF]">
                  {[cliente.cidade, cliente.estado].filter(Boolean).join(" - ") || "—"}
                </p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-4">
                <p className="text-2xl font-bold text-white">{totalOS}</p>
                <p className="text-xs text-[#9CA3AF]">Total OS</p>
              </div>
              <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-4">
                <p className="text-sm font-medium text-white truncate">
                  {ultimaOS ? formatDate(ultimaOS.data_os) : "—"}
                </p>
                <p className="text-xs text-[#9CA3AF]">Última manutenção</p>
              </div>
              <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-4">
                <p className="text-2xl font-bold text-white">{totalOrcamentos}</p>
                <p className="text-xs text-[#9CA3AF]">Orçamentos</p>
              </div>
            </div>

            <div className="rounded-lg border border-[#1E1E1E] bg-[#111111]">
              <div className="flex border-b border-[#1E1E1E]">
                <button
                  type="button"
                  onClick={() => setAba("os")}
                  className={`px-4 py-3 text-sm font-medium ${aba === "os"
                    ? "border-b-2 border-[#CC0000] text-white"
                    : "text-[#9CA3AF] hover:text-white"
                    }`}
                >
                  Ordens de Serviço
                </button>
                <button
                  type="button"
                  onClick={() => setAba("orcamentos")}
                  className={`px-4 py-3 text-sm font-medium ${aba === "orcamentos"
                    ? "border-b-2 border-[#CC0000] text-white"
                    : "text-[#9CA3AF] hover:text-white"
                    }`}
                >
                  Orçamentos
                </button>
              </div>
              <div className="p-4">
                {aba === "os" && (
                  <div className="space-y-2">
                    {ordens.length === 0 ? (
                      <p className="text-[#9CA3AF]">Nenhuma OS cadastrada.</p>
                    ) : (
                      ordens.map((o) => (
                        <div
                          key={o.id}
                          className="flex cursor-pointer items-center justify-between rounded border border-[#1E1E1E] p-3 transition-colors hover:bg-[#1E1E1E]"
                          onClick={() =>
                            router.push(`/ordens-de-servico/${o.id}`)
                          }
                        >
                          <div>
                            <span className="font-medium text-white">
                              OS-{String(o.numero_os).padStart(4, "0")}
                            </span>{" "}
                            <span
                              className={`rounded px-2 py-0.5 text-xs ${IMAGEM_OS_COLORS[o.imagem_os_status] ?? "bg-[#1E1E1E] text-[#9CA3AF]"
                                }`}
                            >
                              {o.imagem_os_status}
                            </span>
                          </div>
                          <div className="text-right text-sm text-[#9CA3AF]">
                            {formatDate(o.data_os)} — {formatCurrency(o.valor_total ?? 0)}
                          </div>
                        </div>
                      ))
                    )}
                    <Button
                      variant="secondary"
                      className="mt-4 w-full sm:w-auto"
                      onClick={() =>
                        router.push(
                          `/ordens-de-servico/nova?cliente=${cliente.id}`
                        )
                      }
                    >
                      Nova OS para este cliente
                    </Button>
                  </div>
                )}
                {aba === "orcamentos" && (
                  <div className="space-y-2">
                    {orcamentos.length === 0 ? (
                      <p className="text-[#9CA3AF]">Nenhum orçamento.</p>
                    ) : (
                      orcamentos.map((o) => (
                        <div
                          key={o.id}
                          className="flex cursor-pointer items-center justify-between rounded border border-[#1E1E1E] p-3 transition-colors hover:bg-[#1E1E1E]"
                          onClick={() =>
                            router.push(`/orcamentos/${o.id}`)
                          }
                        >
                          <div>
                            <span className="font-medium text-white">
                              ORC-{String(o.numero_orcamento).padStart(4, "0")}
                            </span>{" "}
                            <span
                              className={`rounded px-2 py-0.5 text-xs ${STATUS_ORC_COLORS[o.status] ?? "bg-[#1E1E1E]"
                                }`}
                            >
                              {o.status}
                            </span>
                          </div>
                          <div className="text-right text-sm text-[#9CA3AF]">
                            {formatDate(o.data_emissao)} — {formatCurrency(totalOrcamento(o))}
                          </div>
                        </div>
                      ))
                    )}
                    <Button
                      variant="secondary"
                      className="mt-4 w-full sm:w-auto"
                      onClick={() =>
                        router.push(
                          `/orcamentos/nova?cliente=${cliente.id}`
                        )
                      }
                    >
                      Novo Orçamento para este cliente
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ModalCliente
        isOpen={modalCliente}
        onClose={() => setModalCliente(false)}
        cliente={cliente}
        onSuccess={() => {
          setModalCliente(false);
          supabase
            .from("cris_tech_clientes")
            .select("*")
            .eq("id", id)
            .single()
            .then(({ data }) => setCliente(data as CrisTechCliente));
        }}
      />
    </AppLayout>
  );
}
