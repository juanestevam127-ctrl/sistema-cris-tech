"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import type { CrisTechOS, CrisTechOSMaterial, CrisTechCliente } from "@/types";
import { format, addMonths } from "date-fns";
import { Trash2, Plus, Search, ChevronLeft } from "lucide-react";

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
  if (typeof valor !== "string") return valor || 0;
  const limpo = valor.replace(/R\$\s?/, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(limpo) || 0;
}

type MaterialRow = {
  id: string; // temp UUID for keying
  db_id?: string; // actual UUID if exists
  tipo: string;
  quantidade: string;
  valor_unitario: string;
};

// ─── Componente Principal ────────────────────────────────────

function EditarOSForm() {
  const router = useRouter();
  const { id } = useParams();
  const { usuario } = useAuth();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  // Clientes para seleção
  const [clientes, setClientes] = useState<CrisTechCliente[]>([]);

  // Campos gerais
  const [numeroOs, setNumeroOs] = useState<number | null>(null);
  const [dataOs, setDataOs] = useState("");

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
  const [materiais, setMateriais] = useState<MaterialRow[]>([]);

  // Observações
  const [observacoes, setObservacoes] = useState("");

  // Garantia e valores
  const [garantiaMeses, setGarantiaMeses] = useState("0");
  const [taxaVisita, setTaxaVisita] = useState("");

  // ─── Carregar Dados ─────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Carregar clientes
        const { data: cData } = await supabase
          .from("cris_tech_clientes")
          .select("*")
          .order("nome");
        if (cData) setClientes(cData as CrisTechCliente[]);

        // Carregar OS
        const { data, error } = await supabase
          .from("cris_tech_ordens_servico")
          .select("*, cris_tech_os_materiais(*)")
          .eq("id", id)
          .single();

        if (error) throw error;
        if (data) {
          const os = data as CrisTechOS & {
            cris_tech_os_materiais: CrisTechOSMaterial[];
          };
          setNumeroOs(os.numero_os);
          setDataOs(os.data_os);
          setClienteId(os.cliente_id || "");
          setClienteNome(os.cliente_nome);
          setCpfCnpj(os.cliente_cpf_cnpj);
          setCep(os.cliente_endereco_completo.match(/\d{5}-\d{3}/)?.[0] || "");
          setEndereco(os.cliente_endereco_completo);
          setCidade(os.cliente_cidade);
          setEstado(os.cliente_estado);
          setEmail(os.cliente_email || "");
          setTelefone(os.cliente_telefone || "");
          setObservacoes(os.observacoes || "");
          setGarantiaMeses(String(os.garantia_meses));
          setTaxaVisita(os.taxa_visita.toFixed(2).replace(".", ","));

          const mats: MaterialRow[] = os.cris_tech_os_materiais
            .sort((a, b) => a.ordem - b.ordem)
            .map((m) => ({
              id: m.id,
              db_id: m.id,
              tipo: m.tipo,
              quantidade: String(m.quantidade),
              valor_unitario: m.valor_unitario.toFixed(2).replace(".", ","),
            }));
          setMateriais(mats);
        }
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar OS.");
        router.push("/ordens-de-servico");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

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

  const venc = (() => {
    const meses = parseInt(garantiaMeses, 10) || 0;
    if (meses <= 0 || !dataOs) return null;
    return addMonths(new Date(dataOs + "T12:00:00"), meses);
  })();

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
    if (!clienteNome.trim() || !cpfCnpj.trim() || !endereco.trim()) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    setSalvando(true);
    try {
      // 1. Atualizar OS
      const { error: osError } = await supabase
        .from("cris_tech_ordens_servico")
        .update({
          data_os: dataOs,
          cliente_id: clienteId || null,
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (osError) throw osError;

      // 2. Sync Materiais (Delete + Re-insert)
      const { error: delError } = await supabase
        .from("cris_tech_os_materiais")
        .delete()
        .eq("os_id", id);
      if (delError) throw delError;

      const materiaisValidos = materiais.filter(
        (m) => m.tipo.trim() && parseFloat(m.quantidade) > 0
      );
      if (materiaisValidos.length > 0) {
        const materiaisInsert = materiaisValidos.map((m, i) => ({
          os_id: id,
          tipo: m.tipo.trim(),
          quantidade: parseFloat(m.quantidade) || 1,
          valor_unitario: parseBRL(m.valor_unitario),
          ordem: i + 1,
        }));
        const { error: matError } = await supabase
          .from("cris_tech_os_materiais")
          .insert(materiaisInsert);
        if (matError) throw matError;
      }

      toast.success("OS atualizada com sucesso!");
      router.push(`/ordens-de-servico/${id}`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar alterações.");
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#CC0000] border-t-transparent" />
          <p className="text-[#9CA3AF] text-sm font-medium">Carregando dados da OS...</p>
        </div>
      </AppLayout>
    );
  }

  const labelInput =
    "mb-1 block text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]";
  const inputClass =
    "w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#CC0000] disabled:opacity-50";
  const sectionTitle =
    "text-xs font-bold uppercase tracking-widest text-[#CC0000] mb-4 flex items-center gap-2";

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-lg border border-[#1E1E1E] bg-[#111111] p-2 text-[#9CA3AF] hover:text-white"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Editar OS</h1>
              <p className="text-sm text-[#9CA3AF]">Atualize os dados da ordem de serviço</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#6B7280] uppercase tracking-wider">Nº OS</p>
            <p className="text-2xl font-bold text-[#CC0000]">
              OS-{String(numeroOs).padStart(4, "0")}
            </p>
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
        </div>

        {/* Dados do Cliente */}
        <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-6">
          <div className={sectionTitle}>
            <span className="h-px flex-1 bg-[#1E1E1E]" />
            Dados do Cliente
            <span className="h-px flex-1 bg-[#1E1E1E]" />
          </div>

          <div className="mb-6 rounded-lg bg-[#0A0A0A] p-4 border border-[#1E1E1E]">
            <label className={labelInput}>Alterar Cliente</label>
            <div className="relative">
              <select
                value={clienteId}
                onChange={(e) => handleSelectCliente(e.target.value)}
                className={`${inputClass} appearance-none pr-10`}
              >
                <option value="">Outro cliente (manual)...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#9CA3AF]">
                <Search size={16} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelInput}>Nome Completo *</label>
              <input
                type="text"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
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
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelInput}>Cidade *</label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
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
                {[
                  "AC",
                  "AL",
                  "AM",
                  "AP",
                  "BA",
                  "CE",
                  "DF",
                  "ES",
                  "GO",
                  "MA",
                  "MG",
                  "MS",
                  "MT",
                  "PA",
                  "PB",
                  "PE",
                  "PI",
                  "PR",
                  "RJ",
                  "RN",
                  "RO",
                  "RR",
                  "RS",
                  "SC",
                  "SE",
                  "SP",
                  "TO",
                ].map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelInput}>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelInput}>Telefone</label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-[#1E1E1E]">
                  <th className="pb-2 text-left text-xs text-[#6B7280] w-6">#</th>
                  <th className="pb-2 text-left text-xs text-[#6B7280]">Tipo *</th>
                  <th className="pb-2 text-left text-xs text-[#6B7280] w-24">Qtd *</th>
                  <th className="pb-2 text-left text-xs text-[#6B7280] w-36">Unit. (R$) *</th>
                  <th className="pb-2 text-left text-xs text-[#6B7280] w-32">Total</th>
                  <th className="pb-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {materiais.map((m, idx) => (
                  <tr key={m.id}>
                    <td className="py-2 text-[#6B7280]">{idx + 1}</td>
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        value={m.tipo}
                        onChange={(e) =>
                          updateMaterial(m.id, "tipo", e.target.value)
                        }
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
                          updateMaterial(m.id, "valor_unitario", e.target.value)
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="rounded-lg bg-[#1A1A1A] px-3 py-2 border border-[#2A2A2A]">
                        {formatBRL(calcularLinha(m))}
                      </div>
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => removerMaterial(m.id)}
                        disabled={materiais.length <= 1}
                        className="text-[#6B7280] hover:text-red-400 disabled:opacity-20"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={adicionarMaterial}
            disabled={materiais.length >= 5}
            className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-[#2A2A2A] px-4 py-2 text-sm text-[#9CA3AF] hover:border-[#CC0000] hover:text-[#CC0000] transition"
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
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            maxLength={275}
            rows={4}
            className={`${inputClass} resize-none`}
          />
          <p className="mt-1 text-right text-xs text-[#6B7280]">
            {observacoes.length}/275 caracteres
          </p>
        </div>

        {/* Totais */}
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
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-[#CC0000]/30 bg-[#CC0000]/5 p-4">
            <p className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-1">Total da OS</p>
            <p className="text-4xl font-bold text-[#CC0000]">
              {totalOS.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={salvar} loading={salvando}>
            Salvar Alterações
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

export default function EditarOSPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CC0000] border-t-transparent" />
          </div>
        </AppLayout>
      }
    >
      <EditarOSForm />
    </Suspense>
  );
}
