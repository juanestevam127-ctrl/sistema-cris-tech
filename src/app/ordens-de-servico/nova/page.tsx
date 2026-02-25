"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import type { CrisTechOS, CrisTechOSMaterial, CrisTechCliente } from "@/types";
import { format, addMonths } from "date-fns";
import { formatWhatsAppNumber } from "@/lib/utils";
import { Trash2, Plus, Search, User } from "lucide-react";
import { formatDate } from "@/lib/utils";

// ─── Helpers ────────────────────────────────────────────────

function mascaraCPFCNPJ(valor: string): string {
  const nums = valor.replace(/\D/g, "");
  if (nums.length <= 11) {
    return nums
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return nums
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function mascaraTelefone(valor: string): string {
  const nums = valor.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 10) {
    return nums.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  }
  return nums.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

function mascaraCEP(valor: string): string {
  const nums = valor.replace(/\D/g, "").slice(0, 8);
  return nums.replace(/(\d{5})(\d{0,3})/, "$1-$2");
}

function formatBRL(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

function parseBRL(valor: string): number {
  const limpo = valor.replace(/R\$\s?/, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(limpo) || 0;
}

type MaterialRow = {
  id: string;
  tipo: string;
  quantidade: string;
  valor_unitario: string;
};

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
      // Tenta atualizar para concluída apenas se não estiver concluída (evita duplicados em concorrência)
      const { data: osAtual, error: fetchError } = await supabase
        .from("cris_tech_ordens_servico")
        .select("imagem_os_status")
        .eq("id", os.id)
        .single();

      if (fetchError || osAtual?.imagem_os_status === "concluida") {
        return;
      }

      await supabase
        .from("cris_tech_ordens_servico")
        .update({
          imagem_os_url: result.href,
          imagem_os_status: "concluida",
        })
        .eq("id", os.id);
      toast.success("✅ Imagem da OS gerada com sucesso!");

      // Enviar WhatsApp após gerar imagem
      if (os.cliente_telefone) {
        enviarWhatsApp(os.cliente_nome, os.cliente_telefone, result.href);
      }
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

async function enviarWhatsApp(nome: string, telefone: string, imageUrl: string) {
  try {
    const number = formatWhatsAppNumber(telefone);
    await fetch(
      "https://evolution-evolution-api.5rqumh.easypanel.host/message/sendMedia/CrisTech",
      {
        method: "POST",
        headers: {
          apikey: "3E977D89D253-4FC5-A1E5-E270C2FDC4D3",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: number,
          mediatype: "image",
          mimetype: "image/png",
          media: imageUrl,
          fileName: "OrdemDeServico.png",
        }),
      }
    );
    toast.success("✅ OS enviada ao WhatsApp do cliente!");
  } catch (error) {
    console.error("WhatsApp error:", error);
    toast.error("❌ Erro ao enviar WhatsApp");
  }
}

// ─── Componente Principal ────────────────────────────────────

function NovaOSForm() {
  const router = useRouter();
  const { usuario } = useAuth();

  // Clientes para seleção
  const [clientes, setClientes] = useState<CrisTechCliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);

  // Campos gerais
  const hoje = new Date().toISOString().split("T")[0];
  const [dataOs, setDataOs] = useState(hoje);

  // Dados do cliente
  const [clienteId, setClienteId] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  // Materiais
  const [materiais, setMateriais] = useState<MaterialRow[]>([
    { id: crypto.randomUUID(), tipo: "", quantidade: "1", valor_unitario: "" },
  ]);

  // Observações
  const [observacoes, setObservacoes] = useState("");

  // Garantia e valores
  const [garantiaMeses, setGarantiaMeses] = useState("0");
  const [taxaVisita, setTaxaVisita] = useState("");

  const [status, setStatus] = useState<CrisTechOS["status"]>("aberta");
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  // ─── Carregar Clientes ──────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("cris_tech_clientes")
        .select("*")
        .order("nome");
      if (data) setClientes(data as CrisTechCliente[]);
      setLoadingClientes(false);
    };
    load();
  }, []);

  // ─── Seleção de Cliente ─────────────────────────────────
  const handleSelectCliente = (id: string) => {
    setClienteId(id);
    const c = clientes.find((item) => item.id === id);
    if (c) {
      setClienteNome(c.nome);
      setCpfCnpj(c.cpf_cnpj || "");
      setCep(c.cep || "");
      setEndereco(`${c.endereco || ""}${c.numero ? `, ${c.numero}` : ""}${c.complemento ? ` - ${c.complemento}` : ""}${c.bairro ? ` - ${c.bairro}` : ""}`);
      setCidade(c.cidade || "");
      setEstado(c.estado || "");
      setEmail(c.email || "");
      setTelefone(c.celular || c.telefone || "");
    } else {
      setClienteNome("");
      setCpfCnpj("");
      setCep("");
      setEndereco("");
      setCidade("");
      setEstado("");
      setEmail("");
      setTelefone("");
    }
  };

  // ─── Busca CEP ──────────────────────────────────────────
  const buscarCep = async () => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setCidade(data.localidade || "");
        setEstado(data.uf || "");
      } else {
        toast.error("CEP não encontrado.");
      }
    } catch {
      toast.error("Erro ao buscar CEP.");
    } finally {
      setBuscandoCep(false);
    }
  };

  // ─── Cálculos ───────────────────────────────────────────
  const calcularLinha = (m: MaterialRow) => {
    const q = parseFloat(m.quantidade) || 0;
    const v = parseBRL(m.valor_unitario);
    return q * v;
  };

  const somaMateirais = materiais.reduce(
    (acc, m) => acc + calcularLinha(m),
    0
  );
  const taxaV = parseBRL(taxaVisita);
  const totalOS = somaMateirais + taxaV;

  const vencimentoGarantia = () => {
    const meses = parseInt(garantiaMeses, 10) || 0;
    if (meses <= 0 || !dataOs) return null;
    return addMonths(new Date(dataOs + "T12:00:00"), meses);
  };

  // ─── Handlers Materiais ─────────────────────────────────
  const adicionarMaterial = () => {
    if (materiais.length >= 5) return;
    setMateriais([
      ...materiais,
      { id: crypto.randomUUID(), tipo: "", quantidade: "1", valor_unitario: "" },
    ]);
  };

  const removerMaterial = (id: string) => {
    if (materiais.length <= 1) return;
    setMateriais(materiais.filter((m) => m.id !== id));
  };

  const updateMaterial = (
    id: string,
    campo: keyof MaterialRow,
    valor: string
  ) => {
    setMateriais(materiais.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)));
  };

  // ─── Salvar ─────────────────────────────────────────────
  const salvar = async () => {
    if (!clienteId) {
      toast.error("Selecione um cliente.");
      return;
    }
    if (!clienteNome.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    if (!cpfCnpj.trim()) {
      toast.error("Informe CPF/CNPJ do cliente.");
      return;
    }
    if (!telefone.trim()) {
      toast.error("Informe o telefone do cliente (Obrigatório para WhatsApp).");
      return;
    }
    if (!endereco.trim()) {
      toast.error("Informe o endereço completo.");
      return;
    }
    if (!cidade.trim() || !estado.trim()) {
      toast.error("Informe a cidade e o estado.");
      return;
    }
    const materiaisValidos = materiais.filter(
      (m) => m.tipo.trim() && parseFloat(m.quantidade) > 0
    );
    if (materiaisValidos.length === 0) {
      toast.error("Adicione pelo menos um material.");
      return;
    }

    setSalvando(true);
    try {
      const { data: osData, error: osError } = await supabase
        .from("cris_tech_ordens_servico")
        .insert({
          data_os: dataOs,
          cliente_id: clienteId,
          cliente_nome: clienteNome.trim(),
          cliente_endereco_completo: endereco.trim(),
          cliente_cidade: cidade.trim(),
          cliente_estado: estado.trim(),
          cliente_cpf_cnpj: cpfCnpj,
          cliente_email: email.trim() || null,
          cliente_telefone: telefone || null,
          observacoes: observacoes.trim() || null,
          garantia_meses: parseInt(garantiaMeses, 10) || 0,
          taxa_visita: taxaV,
          status: status,
          criado_por: usuario?.id,
        })
        .select("id, numero_os")
        .single();

      if (osError) throw osError;
      const osId = (osData as { id: string; numero_os: number }).id;

      // Inserir materiais
      const materiaisInsert = materiaisValidos.map((m, i) => ({
        os_id: osId,
        tipo: m.tipo.trim(),
        quantidade: parseFloat(m.quantidade) || 1,
        valor_unitario: parseBRL(m.valor_unitario),
        ordem: i + 1,
      }));

      if (materiaisInsert.length > 0) {
        const { error: matError } = await supabase
          .from("cris_tech_os_materiais")
          .insert(materiaisInsert);
        if (matError) throw matError;
      }

      toast.success("OS criada com sucesso!");

      // Buscar OS completa com materiais para Renderform
      const { data: osCompleta } = await supabase
        .from("cris_tech_ordens_servico")
        .select("*, cris_tech_os_materiais(*)")
        .eq("id", osId)
        .single();

      if (osCompleta) {
        const osForRender = {
          ...osCompleta,
          materiais: (osCompleta as Record<string, unknown>)[
            "cris_tech_os_materiais"
          ] as CrisTechOSMaterial[],
        } as CrisTechOS & { materiais: CrisTechOSMaterial[] };

        // Chamar Renderform em background
        gerarImagemOS(osForRender);
      }

      router.push(`/ordens-de-servico/${osId}`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao criar OS.");
    } finally {
      setSalvando(false);
    }
  };

  const venc = vencimentoGarantia();
  const labelInput =
    "mb-1 block text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]";
  const inputClass =
    "w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#CC0000]";
  const sectionTitle =
    "text-xs font-bold uppercase tracking-widest text-[#CC0000] mb-4 flex items-center gap-2";

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Nova Ordem de Serviço</h1>
            <p className="text-sm text-[#9CA3AF]">Preencha os dados abaixo</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-[#6B7280] uppercase tracking-wider">Nº OS</p>
            <p className="text-2xl font-bold text-[#CC0000]">—</p>
          </div>
        </div>

        {/* Data */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-6">
          <div className="max-w-xs">
            <label className={labelInput}>Data da OS *</label>
            <input
              type="date"
              value={dataOs}
              onChange={(e) => setDataOs(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="mt-4 max-w-xs">
            <label className={labelInput}>Status *</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className={inputClass}
            >
              <option value="aberta">Aberta</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        {/* Dados do Cliente */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-6">
          <div className={sectionTitle}>
            <span className="h-px flex-1 bg-[#1E1E1E]" />
            Dados do Cliente
            <span className="h-px flex-1 bg-[#1E1E1E]" />
          </div>

          <div className="mb-6 rounded-lg bg-[#0A0A0A] p-4 border border-[#1E1E1E]">
            <label className={labelInput}>Selecionar Cliente *</label>
            <div className="relative">
              <select
                value={clienteId}
                onChange={(e) => handleSelectCliente(e.target.value)}
                className={`${inputClass} appearance-none pr-10`}
                disabled={loadingClientes}
              >
                <option value="">Selecione um cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} ({c.cpf_cnpj ? formatCpfCnpjLocal(c.cpf_cnpj) : "Sem documento"})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#9CA3AF]">
                <Search size={16} />
              </div>
            </div>
            {loadingClientes && (
              <p className="mt-2 text-xs text-[#6B7280] animate-pulse">Carregando base de clientes...</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 opacity-90">
            <div className="sm:col-span-2">
              <label className={labelInput}>Nome Completo / Snapshot *</label>
              <input
                type="text"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                placeholder="Nome do cliente"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelInput}>CPF / CNPJ *</label>
              <input
                type="text"
                value={cpfCnpj}
                onChange={(e) =>
                  setCpfCnpj(mascaraCPFCNPJ(e.target.value))
                }
                placeholder="000.000.000-00"
                maxLength={18}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelInput}>CEP</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cep}
                  onChange={(e) => setCep(mascaraCEP(e.target.value))}
                  onBlur={buscarCep}
                  placeholder="00000-000"
                  maxLength={9}
                  className={inputClass}
                />
                {buscandoCep && (
                  <div className="flex items-center px-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#CC0000] border-t-transparent" />
                  </div>
                )}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={labelInput}>Endereço Completo *</label>
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, Número, Complemento, Bairro"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelInput}>Cidade *</label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Cidade"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelInput}>Estado *</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className={inputClass}
              >
                <option value="">Selecione...</option>
                {["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"].map(
                  (uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className={labelInput}>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelInput}>Telefone</label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Materiais */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-6">
          <div className={sectionTitle}>
            <span className="h-px flex-1 bg-[#1E1E1E]" />
            Materiais Utilizados
            <span className="h-px flex-1 bg-[#1E1E1E]" />
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-[#1E1E1E]">
                  <th className="pb-2 text-left text-xs text-[#6B7280] w-6">#</th>
                  <th className="pb-2 text-left text-xs text-[#6B7280]">Tipo / Descrição *</th>
                  <th className="pb-2 text-left text-xs text-[#6B7280] w-24">Qtd *</th>
                  <th className="pb-2 text-left text-xs text-[#6B7280] w-36">Valor Unit. (R$) *</th>
                  <th className="pb-2 text-left text-xs text-[#6B7280] w-32">Total (R$)</th>
                  <th className="pb-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {materiais.map((m, idx) => {
                  const total = calcularLinha(m);
                  return (
                    <tr key={m.id}>
                      <td className="py-2 pr-2 text-[#6B7280]">{idx + 1}</td>
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={m.tipo}
                          onChange={(e) =>
                            updateMaterial(m.id, "tipo", e.target.value)
                          }
                          placeholder="Descrição do material"
                          className={inputClass}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={m.quantidade}
                          onChange={(e) =>
                            updateMaterial(m.id, "quantidade", e.target.value)
                          }
                          className={inputClass}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={m.valor_unitario}
                          onChange={(e) =>
                            updateMaterial(
                              m.id,
                              "valor_unitario",
                              e.target.value
                            )
                          }
                          placeholder="0,00"
                          className={inputClass}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <div className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-sm text-white">
                          {formatBRL(total)}
                        </div>
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => removerMaterial(m.id)}
                          disabled={materiais.length <= 1}
                          className="rounded p-1 text-[#6B7280] hover:bg-red-900/20 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View for Materials */}
          <div className="md:hidden space-y-4">
            {materiais.map((m, idx) => {
              const total = calcularLinha(m);
              return (
                <div key={m.id} className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#CC0000]">ITEM #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removerMaterial(m.id)}
                      disabled={materiais.length <= 1}
                      className="text-[#6B7280] hover:text-red-400 disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div>
                    <label className={labelInput}>Tipo / Descrição *</label>
                    <input
                      type="text"
                      value={m.tipo}
                      onChange={(e) => updateMaterial(m.id, "tipo", e.target.value)}
                      placeholder="Descrição do material"
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelInput}>Quantidade *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={m.quantidade}
                        onChange={(e) => updateMaterial(m.id, "quantidade", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelInput}>Valor Unit. (R$) *</label>
                      <input
                        type="text"
                        value={m.valor_unitario}
                        onChange={(e) => updateMaterial(m.id, "valor_unitario", e.target.value)}
                        placeholder="0,00"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-2 text-center">
                    <p className="text-[10px] uppercase font-bold text-[#4B5563] mb-1">Total do Item</p>
                    <p className="text-sm font-bold text-white">{formatBRL(total)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={adicionarMaterial}
            disabled={materiais.length >= 5}
            className="mt-3 flex w-full md:w-auto items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#2A2A2A] px-4 py-3 md:py-2 text-sm text-[#9CA3AF] transition hover:border-[#CC0000] hover:text-[#CC0000] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            Adicionar Material ({materiais.length}/5)
          </button>
        </div>

        {/* Observações */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-6">
          <div className={sectionTitle}>
            <span className="h-px flex-1 bg-[#1E1E1E]" />
            Observações
            <span className="h-px flex-1 bg-[#1E1E1E]" />
          </div>
          <label className={labelInput}>Observações</label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            maxLength={275}
            rows={4}
            placeholder="Observações adicionais..."
            className={`${inputClass} resize-none`}
          />
          <p className="mt-1 text-right text-xs text-[#6B7280]">
            <span className={observacoes.length >= 275 ? "text-red-400" : ""}>
              {observacoes.length}
            </span>
            /275 caracteres
          </p>
        </div>

        {/* Garantia e Valores */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-6">
          <div className={sectionTitle}>
            <span className="h-px flex-1 bg-[#1E1E1E]" />
            Garantia & Valores
            <span className="h-px flex-1 bg-[#1E1E1E]" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className={labelInput}>Garantia (Meses)</label>
              <input
                type="number"
                min="0"
                value={garantiaMeses}
                onChange={(e) => setGarantiaMeses(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-[#6B7280]">
                {venc
                  ? `Vence em: ${format(venc, "dd/MM/yyyy")}`
                  : "Sem garantia"}
              </p>
            </div>
            <div>
              <label className={labelInput}>Taxa de Visita (R$)</label>
              <input
                type="text"
                value={taxaVisita}
                onChange={(e) => setTaxaVisita(e.target.value)}
                placeholder="0,00"
                className={inputClass}
              />
            </div>
          </div>

          {/* Total */}
          <div className="mt-6 rounded-xl border border-[#CC0000]/30 bg-[#CC0000]/5 p-4">
            <p className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-1">Total da OS</p>
            <p className="text-4xl font-bold text-[#CC0000]">
              {totalOS.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">
              Materiais: {formatBRL(somaMateirais)} + Taxa Visita: {formatBRL(taxaV)}
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button variant="ghost" className="w-full sm:w-auto order-2 sm:order-1" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button variant="primary" className="w-full sm:w-auto order-1 sm:order-2" onClick={salvar} loading={salvando}>
            Salvar Ordem de Serviço
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

function formatCpfCnpjLocal(valor: string): string {
  const nums = valor.replace(/\D/g, "");
  if (nums.length <= 11) {
    return nums
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return nums
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export default function NovaOSPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CC0000] border-t-transparent" />
          </div>
        </AppLayout>
      }
    >
      <NovaOSForm />
    </Suspense>
  );
}
