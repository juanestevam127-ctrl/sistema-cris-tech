"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import type { CrisTechOSMaterial } from "@/types";
import { format, addMonths } from "date-fns";
import { Trash2, Plus } from "lucide-react";

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
  return parseFloat(valor.replace(/\./g, "").replace(",", ".")) || 0;
}

type MaterialRow = {
  id: string;
  dbId?: string;
  tipo: string;
  quantidade: string;
  valor_unitario: string;
};

// ─── Componente Principal ────────────────────────────────────

export default function EditarOSPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { usuario } = useAuth();

  const [loading, setLoading] = useState(true);
  const [numeroOs, setNumeroOs] = useState<number | null>(null);

  // Campos
  const [dataOs, setDataOs] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [materiais, setMateriais] = useState<MaterialRow[]>([
    { id: crypto.randomUUID(), tipo: "", quantidade: "1", valor_unitario: "" },
  ]);
  const [observacoes, setObservacoes] = useState("");
  const [garantiaMeses, setGarantiaMeses] = useState("0");
  const [taxaVisita, setTaxaVisita] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: osData } = await supabase
        .from("cris_tech_ordens_servico")
        .select("*")
        .eq("id", id)
        .single();

      const { data: matData } = await supabase
        .from("cris_tech_os_materiais")
        .select("*")
        .eq("os_id", id)
        .order("ordem");

      if (osData) {
        const o = osData as Record<string, unknown>;
        setNumeroOs(o.numero_os as number);
        setDataOs((o.data_os as string)?.split("T")[0] ?? "");
        setClienteNome((o.cliente_nome as string) ?? "");
        setCpfCnpj((o.cliente_cpf_cnpj as string) ?? "");
        setEndereco((o.cliente_endereco_completo as string) ?? "");
        setCidade((o.cliente_cidade as string) ?? "");
        setEstado((o.cliente_estado as string) ?? "");
        setEmail((o.cliente_email as string) ?? "");
        setTelefone((o.cliente_telefone as string) ?? "");
        setObservacoes((o.observacoes as string) ?? "");
        setGarantiaMeses(String(o.garantia_meses ?? 0));
        setTaxaVisita(
          o.taxa_visita ? String(o.taxa_visita).replace(".", ",") : ""
        );
      }

      if (matData && matData.length > 0) {
        setMateriais(
          (matData as CrisTechOSMaterial[]).map((m) => ({
            id: crypto.randomUUID(),
            dbId: m.id,
            tipo: m.tipo,
            quantidade: String(m.quantidade),
            valor_unitario: m.valor_unitario
              .toFixed(2)
              .replace(".", ","),
          }))
        );
      }

      setLoading(false);
    };
    load();
  }, [id]);

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

  const calcularLinha = (m: MaterialRow) => {
    const q = parseFloat(m.quantidade) || 0;
    const v = parseBRL(m.valor_unitario);
    return q * v;
  };

  const somaMateirais = materiais.reduce((acc, m) => acc + calcularLinha(m), 0);
  const taxaV = parseBRL(taxaVisita);
  const totalOS = somaMateirais + taxaV;

  const vencimentoGarantia = () => {
    const meses = parseInt(garantiaMeses, 10) || 0;
    if (meses <= 0 || !dataOs) return null;
    return addMonths(new Date(dataOs), meses);
  };

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

  const salvar = async () => {
    if (!clienteNome.trim() || !cpfCnpj.trim() || !endereco.trim() || !cidade.trim() || !estado.trim()) {
      toast.error("Preencha todos os campos obrigatórios do cliente.");
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
      const { error: osError } = await supabase
        .from("cris_tech_ordens_servico")
        .update({
          data_os: dataOs,
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

      // Sync materiais: delete all and reinsert
      await supabase.from("cris_tech_os_materiais").delete().eq("os_id", id);
      const materiaisInsert = materiaisValidos.map((m, i) => ({
        os_id: id,
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

      toast.success("OS atualizada!");
      router.push(`/ordens-de-servico/${id}`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar OS.");
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#CC0000] border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Editar Ordem de Serviço</h1>
            <p className="text-sm text-[#9CA3AF]">Altere os dados da OS</p>
          </div>
          {numeroOs !== null && (
            <div className="text-right">
              <p className="text-xs text-[#6B7280] uppercase tracking-wider">Nº OS</p>
              <p className="text-2xl font-bold text-[#CC0000]">
                {String(numeroOs).padStart(4, "0")}
              </p>
            </div>
          )}
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
                onChange={(e) => setCpfCnpj(mascaraCPFCNPJ(e.target.value))}
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
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelInput}>Telefone</label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
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
          <div className="overflow-x-auto">
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
                          onChange={(e) => updateMaterial(m.id, "tipo", e.target.value)}
                          className={inputClass}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={m.quantidade}
                          onChange={(e) => updateMaterial(m.id, "quantidade", e.target.value)}
                          className={inputClass}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={m.valor_unitario}
                          onChange={(e) => updateMaterial(m.id, "valor_unitario", e.target.value)}
                          placeholder="0,00"
                          className={inputClass}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <div className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-sm text-white">
                          {`R$ ${total.toFixed(2).replace(".", ",")}`}
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
          <button
            type="button"
            onClick={adicionarMaterial}
            disabled={materiais.length >= 5}
            className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-[#2A2A2A] px-4 py-2 text-sm text-[#9CA3AF] transition hover:border-[#CC0000] hover:text-[#CC0000] disabled:opacity-40 disabled:cursor-not-allowed"
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
          <div className="mt-6 rounded-xl border border-[#CC0000]/30 bg-[#CC0000]/5 p-4">
            <p className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-1">Total da OS</p>
            <p className="text-4xl font-bold text-[#CC0000]">
              {totalOS.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">
              Materiais: {`R$ ${somaMateirais.toFixed(2).replace(".", ",")}`} + Taxa Visita: {`R$ ${taxaV.toFixed(2).replace(".", ",")}`}
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
