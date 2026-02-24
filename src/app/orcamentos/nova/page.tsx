"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useClientesAll } from "@/hooks/useClientesAll";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { supabase } from "@/lib/supabaseClient";
import { Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency, formatWhatsAppNumber } from "@/lib/utils";
import { format } from "date-fns";

interface ItemOrc {
    id: string;
    descricao: string;
    quantidade: number;
    valorUnitario: number;
}

export default function NovoOrcamentoPage() {
    const router = useRouter();
    const { usuario } = useAuth();
    const { clientes } = useClientesAll();
    const [clienteId, setClienteId] = useState("");
    const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split("T")[0]);
    const [dataValidade, setDataValidade] = useState("");
    const [descricao, setDescricao] = useState("");
    const [observacoes, setObservacoes] = useState("");
    const [itens, setItens] = useState<ItemOrc[]>([
        { id: crypto.randomUUID(), descricao: "", quantidade: 1, valorUnitario: 0 },
    ]);
    const [salvando, setSalvando] = useState(false);

    // Campos adicionais para snapshot (necessários para a imagem)
    const [clienteNome, setClienteNome] = useState("");
    const [cpfCnpj, setCpfCnpj] = useState("");
    const [endereco, setEndereco] = useState("");
    const [cidade, setCidade] = useState("");
    const [estado, setEstado] = useState("");
    const [email, setEmail] = useState("");
    const [telefone, setTelefone] = useState("");

    const handleSelectCliente = (id: string) => {
        setClienteId(id);
        const c = clientes.find((item) => item.id === id);
        if (c) {
            setClienteNome(c.nome);
            setCpfCnpj(c.cpf_cnpj || "");
            setEndereco(`${c.endereco || ""}${c.numero ? `, ${c.numero}` : ""}${c.complemento ? ` - ${c.complemento}` : ""}${c.bairro ? ` - ${c.bairro}` : ""}`);
            setCidade(c.cidade || "");
            setEstado(c.estado || "");
            setEmail(c.email || "");
            setTelefone(c.celular || c.telefone || "");
        } else {
            setClienteNome("");
            setCpfCnpj("");
            setEndereco("");
            setCidade("");
            setEstado("");
            setEmail("");
            setTelefone("");
        }
    };

    const addItem = () => {
        if (itens.length >= 5) return;
        setItens((prev) => [...prev, { id: crypto.randomUUID(), descricao: "", quantidade: 1, valorUnitario: 0 }]);
    };

    const updateItem = (itemId: string, field: keyof ItemOrc, value: string | number) => {
        setItens((prev) => prev.map((i) => (i.id === itemId ? { ...i, [field]: value } : i)));
    };

    const removeItem = (itemId: string) => {
        if (itens.length <= 1) return;
        setItens((prev) => prev.filter((i) => i.id !== itemId));
    };

    const totalGeral = itens.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0);

    const salvar = async () => {
        if (!clienteId) {
            toast.error("Selecione o cliente.");
            return;
        }
        if (!telefone.trim()) {
            toast.error("Informe o telefone do cliente (Obrigatório para WhatsApp).");
            return;
        }
        const itensValidos = itens.filter((i) => i.descricao.trim());
        if (!itensValidos.length) {
            toast.error("Adicione pelo menos um item.");
            return;
        }

        setSalvando(true);
        try {
            // 1. Inserir orçamento
            const { data: orc, error: orcError } = await supabase
                .from("cris_tech_orcamentos")
                .insert({
                    cliente_id: clienteId,
                    status: "pendente",
                    data_emissao: dataEmissao ? `${dataEmissao}T12:00:00` : new Date().toISOString(),
                    data_validade: dataValidade || null,
                    descricao: descricao || null,
                    observacoes: observacoes || null,
                    criado_por: usuario?.id,
                    // Snapshots
                    cliente_nome: clienteNome,
                    cliente_endereco_completo: endereco,
                    cliente_cidade: cidade,
                    cliente_estado: estado,
                    cliente_cpf_cnpj: cpfCnpj,
                    cliente_email: email || null,
                    cliente_telefone: telefone,
                })
                .select("id")
                .single();

            if (orcError) throw orcError;

            // 2. Inserir itens
            const orcId = orc.id;
            for (let idx = 0; idx < itensValidos.length; idx++) {
                const i = itensValidos[idx];
                const { error: itemError } = await supabase.from("cris_tech_orcamento_itens").insert({
                    orcamento_id: orcId,
                    descricao: i.descricao.trim(),
                    quantidade: i.quantidade,
                    valor_unitario: i.valorUnitario,
                    ordem: idx,
                });
                if (itemError) throw itemError;
            }

            toast.success("Orçamento criado com sucesso!");

            // 3. Buscar orçamento completo com itens para Renderform
            const { data: orcCompleto } = await supabase
                .from("cris_tech_orcamentos")
                .select("*, cris_tech_orcamento_itens(*)")
                .eq("id", orcId)
                .single();

            if (orcCompleto) {
                gerarImagemOrc(orcCompleto);
            }

            router.push(`/orcamentos/${orcId}`);
        } catch (e) {
            console.error(e);
            toast.error("Erro ao salvar orçamento.");
        } finally {
            setSalvando(false);
        }
    };

    const gerarImagemOrc = async (orc: any) => {
        try {
            await supabase.from("cris_tech_orcamentos").update({ imagem_orc_status: "gerando" }).eq("id", orc.id);

            const itensRaw = orc.cris_tech_orcamento_itens || [];
            const ip = Array.from({ length: 5 }, (_, i) => {
                const it = itensRaw[i];
                return {
                    tipo: it?.descricao || "-",
                    qntd: it ? String(it.quantidade) : "-",
                    valor: it ? `R$ ${it.valor_unitario.toFixed(2).replace(".", ",")}` : "-",
                };
            });

            // Calcular total a partir dos itens do banco (não do estado React)
            const totalItensBanco = itensRaw.reduce(
                (acc: number, it: any) => acc + (it.valor_total || it.quantidade * it.valor_unitario || 0),
                0
            );
            const totalFormatado = `R$ ${totalItensBanco.toFixed(2).replace(".", ",")}`;

            const renderData: Record<string, string> = {
                "data.text": format(new Date(orc.data_emissao), "dd/MM/yyyy"),
                "cimente-te": orc.cliente_nome || "-",
                "cpf_cnpj.text": orc.cliente_cpf_cnpj || "-",
                "endereco.text": orc.cliente_endereco_completo || "-",
                "cidade.text": orc.cliente_cidade || "-",
                "estado.text": orc.cliente_estado || "-",
                "email.text": orc.cliente_email || "-",
                "telefone.text": orc.cliente_telefone || "-",
                "tipo1.text": ip[0].tipo,
                "qntd1.text": ip[0].qntd,
                "valor1.text": ip[0].valor,
                "tipo2.text": ip[1].tipo,
                "qntd2.text": ip[1].qntd,
                "valor2.text": ip[1].valor,
                "tipo3.text": ip[2].tipo,
                "qntd3.text": ip[2].qntd,
                "valor3.text": ip[2].valor,
                "tipo4.text": ip[3].tipo,
                "qntd4.text": ip[3].qntd,
                "valor4.text": ip[3].valor,
                "tipo5.text": ip[4].tipo,
                "qntd5.text": ip[4].qntd,
                "valor5.text": ip[4].valor,
                "observacao.text": orc.descricao || "-",
                "taxa_visita.text": "-",
                "valor_total.text": totalFormatado
            };

            const response = await fetch("https://get.renderform.io/api/v2/render", {
                method: "POST",
                headers: {
                    "X-API-KEY": "key-zEze7Eo2dJ3RBLiRtni2z2ANGM5GlHTqW6",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    template: "short-flies-fight-happily-1555",
                    data: renderData,
                }),
            });

            const result = await response.json();

            if (result.href) {
                await supabase.from("cris_tech_orcamentos").update({
                    imagem_orc_url: result.href,
                    imagem_orc_status: "concluida"
                }).eq("id", orc.id);

                toast.success("✅ Imagem do Orçamento gerada!");

                if (orc.cliente_telefone) {
                    enviarWhatsApp(orc.cliente_nome, orc.cliente_telefone, result.href);
                }
            }
        } catch (error) {
            console.error("Renderform error:", error);
            await supabase.from("cris_tech_orcamentos").update({ imagem_orc_status: "erro" }).eq("id", orc.id);
        }
    };

    const enviarWhatsApp = async (nome: string, telefone: string, imageUrl: string) => {
        try {
            const number = formatWhatsAppNumber(telefone);
            await fetch("https://evolution-evolution-api.5rqumh.easypanel.host/message/sendMedia/CrisTech", {
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
                    fileName: "Orcamento.png",
                }),
            });
            toast.success("✅ Orçamento enviado ao WhatsApp!");
        } catch (error) {
            console.error("WhatsApp error:", error);
        }
    };

    return (
        <AppLayout>
            <div className="mx-auto max-w-4xl space-y-6">
                <h1 className="text-2xl font-bold text-white">Novo Orçamento</h1>
                <div className="space-y-4 rounded-lg border border-[#1E1E1E] bg-[#111111] p-6">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">CLIENTE *</label>
                        <select
                            value={clienteId}
                            onChange={(e) => handleSelectCliente(e.target.value)}
                            className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-white outline-none focus:ring-1 focus:ring-[#CC0000]"
                        >
                            <option value="">Selecione um cliente...</option>
                            {clientes.map((c) => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                            ))}
                        </select>
                    </div>

                    {/* Snapshot Fields (Simplified visibility) */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 opacity-80">
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">NOME COMPLETO *</label>
                            <input
                                value={clienteNome}
                                onChange={(e) => setClienteNome(e.target.value)}
                                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">CPF/CNPJ *</label>
                            <input
                                value={cpfCnpj}
                                onChange={(e) => setCpfCnpj(e.target.value)}
                                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">TELEFONE *</label>
                            <input
                                value={telefone}
                                onChange={(e) => setTelefone(e.target.value)}
                                placeholder="(00) 00000-0000"
                                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-white"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">ENDEREÇO *</label>
                            <input
                                value={endereco}
                                onChange={(e) => setEndereco(e.target.value)}
                                className="w-full rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">DATA EMISSÃO *</label>
                            <Input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">DATA VALIDADE</label>
                            <Input type="date" value={dataValidade} onChange={(e) => setDataValidade(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">DESCRIÇÃO GERAL</label>
                        <Textarea
                            placeholder="Ex: Reforma de motor, Manutenção preventiva..."
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            rows={2}
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-[#9CA3AF]">ITENS</label>
                        <div className="overflow-x-auto rounded border border-[#1E1E1E]">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[#1E1E1E] bg-[#1A1A1A]">
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-[#9CA3AF]">#</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-[#9CA3AF]">Descrição *</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-[#9CA3AF]">Qtd *</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-[#9CA3AF]">Valor Unit. *</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-[#9CA3AF]">Total</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-[#9CA3AF]"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itens.map((item, idx) => (
                                        <tr key={item.id} className="border-b border-[#1E1E1E] last:border-0 hover:bg-[#1A1A1A]">
                                            <td className="px-3 py-2 text-[#9CA3AF] text-sm">{idx + 1}</td>
                                            <td className="px-3 py-2">
                                                <input
                                                    value={item.descricao}
                                                    onChange={(e) => updateItem(item.id, "descricao", e.target.value)}
                                                    placeholder="Descrição do item"
                                                    className="w-full min-w-[200px] rounded border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1.5 text-sm text-white"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    min={0.01}
                                                    step={0.01}
                                                    value={item.quantidade}
                                                    onChange={(e) => updateItem(item.id, "quantidade", parseFloat(e.target.value) || 0)}
                                                    className="w-20 rounded border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1.5 text-sm text-white"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={0.01}
                                                    value={item.valorUnitario}
                                                    onChange={(e) => updateItem(item.id, "valorUnitario", parseFloat(e.target.value.replace(",", ".")) || 0)}
                                                    className="w-28 rounded border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1.5 text-sm text-white"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-[#9CA3AF] text-sm">
                                                {formatCurrency(item.quantidade * item.valorUnitario)}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(item.id)}
                                                    className="rounded p-1 text-[#9CA3AF] hover:bg-red-900/30 hover:text-red-400"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Button
                            variant="secondary"
                            className="mt-2 text-sm"
                            onClick={addItem}
                            disabled={itens.length >= 5}
                        >
                            <Plus size={16} /> Adicionar Item ({itens.length}/5)
                        </Button>
                    </div>

                    <div className="flex justify-between border-t border-[#1E1E1E] pt-4">
                        <span className="font-semibold text-white">TOTAL GERAL:</span>
                        <span className="text-xl font-bold text-[#CC0000]">{formatCurrency(totalGeral)}</span>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-[#9CA3AF]">OBSERVAÇÕES INTERNAS</label>
                        <Textarea
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                            rows={2}
                            placeholder="Anotações para controle interno..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-6">
                        <Button variant="ghost" onClick={() => router.back()}>
                            Cancelar
                        </Button>
                        <Button variant="primary" onClick={salvar} loading={salvando}>
                            Criar Orçamento
                        </Button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
