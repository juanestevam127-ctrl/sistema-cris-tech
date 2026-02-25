"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import type { CrisTechOS, CrisTechOSMaterial } from "@/types";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDate } from "@/lib/utils";

// ─── Renderform ─────────────────────────────────────────────

async function gerarImagemOS(
  os: CrisTechOS & { materiais?: CrisTechOSMaterial[] }
) {
  try {
    await supabase
      .from("cris_tech_ordens_servico")
      .update({ imagem_os_status: "gerando" })
      .eq("id", os.id);

    const garantiaDias = os.garantia_meses * 30;
    const materiais = os.materiais || [];
    const mp = Array.from({ length: 5 }, (_, i) => {
      const m = materiais[i];
      return {
        tipo: m?.tipo || "-",
        qntd: m ? String(m.quantidade) : "-",
        valor: m?.valor_total
          ? `R$ ${m.valor_total.toFixed(2).replace(".", ",")}`
          : "-",
      };
    });

    const renderData: Record<string, string> = {
      "data.text": formatDate(os.data_os),
      "cliente.text": os.cliente_nome || "-",
      "cpf_cnpj.text": os.cliente_cpf_cnpj || "-",
      "endereco.text": os.cliente_endereco_completo || "-",
      "cidade.text": os.cliente_cidade || "-",
      "estado.text": os.cliente_estado || "-",
      "email.text": os.cliente_email || "-",
      "telefone.text": os.cliente_telefone || "-",
      "tipo1.text": mp[0].tipo,
      "qntd1.text": mp[0].qntd,
      "valor1.text": mp[0].valor,
      "tipo2.text": mp[1].tipo,
      "qntd2.text": mp[1].qntd,
      "valor2.text": mp[1].valor,
      "tipo3.text": mp[2].tipo,
      "qntd3.text": mp[2].qntd,
      "valor3.text": mp[2].valor,
      "tipo4.text": mp[3].tipo,
      "qntd4.text": mp[3].qntd,
      "valor4.text": mp[3].valor,
      "tipo5.text": mp[4].tipo,
      "qntd5.text": mp[4].qntd,
      "valor5.text": mp[4].valor,
      "observacao.text": os.observacoes || "-",
      "numero_ordem_servico.text": String(os.numero_os).padStart(4, "0"),
      "taxa_visita.text":
        os.taxa_visita > 0
          ? `R$ ${os.taxa_visita.toFixed(2).replace(".", ",")}`
          : "-",
      "valor_total.text": `R$ ${os.valor_total.toFixed(2).replace(".", ",")}`,
      "garantia.text":
        garantiaDias > 0
          ? `Garantia de mão-de-obra: ${garantiaDias} dias`
          : "-",
      "nome_cliente_assinatura.text": os.cliente_nome || "-",
    };

    const response = await fetch("https://get.renderform.io/api/v2/render", {
      method: "POST",
      headers: {
        "X-API-KEY": "key-zEze7Eo2dJ3RBLiRtni2z2ANGM5GlHTqW6",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template: "eager-sheep-bake-madly-1383",
        data: renderData,
      }),
    });
    const result = await response.json();
    if (result.href) {
      await supabase
        .from("cris_tech_ordens_servico")
        .update({ imagem_os_url: result.href, imagem_os_status: "concluida" })
        .eq("id", os.id);
      toast.success("✅ Imagem da OS gerada com sucesso!");
    } else {
      throw new Error("URL não retornada");
    }
  } catch (error) {
    await supabase
      .from("cris_tech_ordens_servico")
      .update({ imagem_os_status: "erro" })
      .eq("id", os.id);
    toast.error("❌ Erro ao gerar imagem da OS");
    console.error("Renderform error:", error);
  }
}

// ─── Badge Renderform ────────────────────────────────────────

function RenderformBadge({
  status,
}: {
  status: CrisTechOS["imagem_os_status"];
}) {
  const configs = {
    pendente: {
      cls: "bg-[#374151] text-[#9CA3AF]",
      label: "⏳ Aguardando geração",
    },
    gerando: {
      cls: "bg-amber-900/40 text-amber-400",
      label: "🔄 Gerando imagem...",
    },
    concluida: {
      cls: "bg-green-900/40 text-green-400",
      label: "✅ Imagem disponível",
    },
    erro: { cls: "bg-red-900/40 text-red-400", label: "❌ Erro na geração" },
  };
  const c = configs[status] ?? configs.pendente;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${c.cls}`}>
      {c.label}
    </span>
  );
}

// ─── Componente Principal ────────────────────────────────────

export default function OSDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario } = useAuth();
  const id = params.id as string;

  const [os, setOs] = useState<
    (CrisTechOS & { materiais: CrisTechOSMaterial[] }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [gerandoImagem, setGerandoImagem] = useState(false);

  const podeExcluir =
    usuario?.role === "master" || usuario?.role === "admin";

  const carregar = async () => {
    try {
      const { data } = await supabase
        .from("cris_tech_ordens_servico")
        .select("*, cris_tech_os_materiais(*)")
        .eq("id", id)
        .single();

      if (data) {
        const raw = data as Record<string, unknown>;
        setOs({
          ...(raw as unknown as CrisTechOS),
          materiais: (
            (raw["cris_tech_os_materiais"] as CrisTechOSMaterial[]) ?? []
          ).sort((a, b) => a.ordem - b.ordem),
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar OS.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const tentarGerarImagem = async () => {
    if (!os) return;
    setGerandoImagem(true);
    // Otimista: mudar status local
    setOs((prev) => prev ? { ...prev, imagem_os_status: "gerando" } : prev);
    await gerarImagemOS(os);
    // Recarregar para pegar URL atualizada
    await carregar();
    setGerandoImagem(false);
  };

  if (loading || !os) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CC0000] border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  const garantiaDias = os.garantia_meses * 30;
  const dataFormatada = os.data_os
    ? format(new Date(os.data_os + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", {
      locale: ptBR,
    })
    : "-";

  const formatBRL = (valor: number) =>
    valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <AppLayout>
      {/* Print CSS */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; border: 1px solid #ccc !important; }
        }
      `}</style>

      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        {/* Toolbar — no-print */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">
              OS-{String(os.numero_os).padStart(4, "0")}
            </h1>
            <p className="text-sm text-[#9CA3AF]">Visualização da Ordem de Serviço</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => router.push("/ordens-de-servico")}
            >
              ← Voltar
            </Button>
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() =>
                router.push(`/ordens-de-servico/${id}/editar`)
              }
            >
              ✏️ Editar
            </Button>
            <Button
              variant="primary"
              className="w-full sm:w-auto"
              onClick={() => window.print()}
            >
              🖨️ Imprimir
            </Button>
          </div>
        </div>

        {/* ─── Nota Fiscal ──────────────────────────────── */}
        <div className="print-area rounded-2xl border border-[#1E1E1E] bg-[#111111] overflow-hidden">
          {/* Cabeçalho vermelho */}
          <div className="bg-[#CC0000] px-4 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-wide">
                CRIS TECH
              </h2>
              <p className="text-[#ffdddd] text-xs tracking-widest uppercase">
                Tecnologia & Serviços
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-white text-xs uppercase tracking-wider opacity-80">
                Ordem de Serviço
              </p>
              <p className="text-white text-3xl font-bold">
                Nº {String(os.numero_os).padStart(4, "0")}
              </p>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* Data */}
            <div className="flex flex-col sm:flex-row justify-between gap-2 text-sm">
              <span className="text-[#9CA3AF]">
                Data:{" "}
                <span className="text-white font-medium">{dataFormatada}</span>
              </span>
              <span className="text-[#9CA3AF]">
                Status:{" "}
                <span className="text-white font-medium uppercase">{os.status}</span>
              </span>
            </div>

            {/* Dados do cliente */}
            <div className="rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] p-4 sm:p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#CC0000] mb-4">
                Dados do Cliente
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 text-sm">
                <DetailRow label="Cliente" value={os.cliente_nome} />
                <DetailRow label="CPF/CNPJ" value={os.cliente_cpf_cnpj} />
                <DetailRow
                  label="Endereço"
                  value={os.cliente_endereco_completo}
                  span
                />
                <DetailRow label="Cidade" value={os.cliente_cidade} />
                <DetailRow label="Estado" value={os.cliente_estado} />
                <DetailRow label="E-mail" value={os.cliente_email || "-"} />
                <DetailRow label="Telefone" value={os.cliente_telefone || "-"} />
              </div>
            </div>

            {/* Materiais */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#CC0000] mb-3">
                Materiais Utilizados
              </h3>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-[#1A1A1A]">
                <table className="w-full text-sm">
                  <thead className="bg-[#0D0D0D]">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs uppercase text-[#6B7280]">
                        Tipo
                      </th>
                      <th className="px-4 py-2.5 text-center text-xs uppercase text-[#6B7280]">
                        Qtd
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs uppercase text-[#6B7280]">
                        Valor Unit.
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs uppercase text-[#6B7280]">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A1A]">
                    {os.materiais.length > 0 ? (
                      os.materiais.map((m) => (
                        <tr key={m.id} className="hover:bg-[#0A0A0A]">
                          <td className="px-4 py-3 text-white">{m.tipo}</td>
                          <td className="px-4 py-3 text-center text-[#9CA3AF]">
                            {m.quantidade}
                          </td>
                          <td className="px-4 py-3 text-right text-[#9CA3AF]">
                            {formatBRL(m.valor_unitario)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-white">
                            {formatBRL(m.valor_total)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-6 text-center text-[#6B7280]"
                        >
                          Nenhum material registrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile List View */}
              <div className="md:hidden space-y-3">
                {os.materiais.length > 0 ? (
                  os.materiais.map((m) => (
                    <div key={m.id} className="rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] p-4 space-y-2">
                      <p className="text-sm font-bold text-white">{m.tipo}</p>
                      <div className="flex justify-between text-xs text-[#9CA3AF]">
                        <span>Qtd: {m.quantidade}</span>
                        <span>Unit: {formatBRL(m.valor_unitario)}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-[#1A1A1A] pt-2">
                        <span className="text-[10px] uppercase font-bold text-[#4B5563]">Total do Item</span>
                        <span className="text-sm font-bold text-white">{formatBRL(m.valor_total)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] p-6 text-center text-[#6B7280] text-sm">
                    Nenhum material registrado
                  </div>
                )}
              </div>
            </div>

            {/* Observações */}
            {os.observacoes && (
              <div className="rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#CC0000] mb-2">
                  Observações
                </h3>
                <p className="text-sm text-[#9CA3AF] whitespace-pre-wrap">
                  {os.observacoes}
                </p>
              </div>
            )}

            {/* Garantia e Totais */}
            <div className="rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] p-5">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#CC0000] mb-2">
                    Garantia
                  </h3>
                  <p className="text-sm text-[#9CA3AF]">
                    {garantiaDias > 0
                      ? `Garantia de mão-de-obra: ${garantiaDias} dias`
                      : "Sem garantia"}
                  </p>
                  {os.data_vencimento_garantia && (
                    <p className="text-xs text-[#6B7280] mt-1">
                      Vence em:{" "}
                      {format(
                        new Date(os.data_vencimento_garantia + "T12:00:00"),
                        "dd/MM/yyyy"
                      )}
                    </p>
                  )}
                </div>
                <div className="text-right space-y-2">
                  {os.taxa_visita > 0 && (
                    <p className="text-sm text-[#9CA3AF]">
                      Taxa de Visita:{" "}
                      <span className="text-white font-medium">
                        {formatBRL(os.taxa_visita)}
                      </span>
                    </p>
                  )}
                  <p className="text-2xl font-bold text-[#CC0000]">
                    Total: {formatBRL(os.valor_total)}
                  </p>
                </div>
              </div>
            </div>

            {/* Assinatura */}
            <div className="border-t border-[#1A1A1A] pt-6">
              <div className="flex justify-center">
                <div className="text-center">
                  <div className="border-b border-[#6B7280] w-64 mb-2" />
                  <p className="text-sm text-[#9CA3AF]">
                    Cliente: {os.cliente_nome}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Card Renderform ──────────────────────────── */}
        <div className="no-print rounded-2xl border border-[#1E1E1E] bg-[#111111] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">
              📄 Imagem da Ordem de Serviço
            </h3>
            <RenderformBadge status={os.imagem_os_status} />
          </div>

          {os.imagem_os_status === "concluida" && os.imagem_os_url && (
            <div>
              <img
                src={os.imagem_os_url}
                alt={`OS ${os.numero_os}`}
                className="w-full rounded-lg border border-[#1E1E1E]"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => window.open(os.imagem_os_url, "_blank")}
                >
                  🔍 Ver em Tamanho Real
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = os.imagem_os_url!;
                    a.download = `OS-${String(os.numero_os).padStart(4, "0")}.png`;
                    a.click();
                  }}
                >
                  💾 Baixar Imagem
                </Button>
              </div>
            </div>
          )}

          {os.imagem_os_status === "gerando" && (
            <div className="flex items-center gap-3 rounded-lg bg-amber-900/10 border border-amber-900/20 p-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              <p className="text-sm text-amber-400">
                Aguardando a Renderform processar a imagem...
              </p>
            </div>
          )}

          {os.imagem_os_status === "pendente" && (
            <p className="text-sm text-[#6B7280]">
              A imagem ainda não foi gerada. Ela é criada automaticamente ao
              salvar a OS.
            </p>
          )}

          {os.imagem_os_status === "erro" && (
            <div className="space-y-3">
              <p className="text-sm text-red-400">
                Houve um erro ao gerar a imagem da OS.
              </p>
              <Button
                variant="primary"
                loading={gerandoImagem}
                onClick={tentarGerarImagem}
              >
                🔄 Tentar Gerar Imagem Novamente
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

// ─── Helper Component ────────────────────────────────────────

function DetailRow({
  label,
  value,
  span,
}: {
  label: string;
  value: string;
  span?: boolean;
}) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <span className="text-[#6B7280] text-xs">{label}: </span>
      <span className="text-white">{value || "-"}</span>
    </div>
  );
}
