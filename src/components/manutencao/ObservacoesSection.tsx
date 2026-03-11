"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import toast from "react-hot-toast";
import type { CrisTechModeloObservacao } from "@/types";
import { useAuth } from "@/hooks/useAuth";

interface ObservacoesSectionProps {
    valor: string;
    onChange: (valor: string) => void;
    label?: string;
    placeholder?: string;
}

export function ObservacoesSection({
    valor,
    onChange,
    label = "Observações",
    placeholder = "Observações adicionais...",
}: ObservacoesSectionProps) {
    const { usuario } = useAuth();
    const [modelos, setModelos] = useState<CrisTechModeloObservacao[]>([]);
    const [salvandoModelo, setSalvandoModelo] = useState(false);

    useEffect(() => {
        carregarModelos();
    }, []);

    const carregarModelos = async () => {
        try {
            const { data } = await supabase
                .from("cris_tech_modelos_observacao")
                .select("*")
                .order("created_at", { ascending: false });
            if (data) {
                setModelos(data as CrisTechModeloObservacao[]);
            }
        } catch (error) {
            console.error("Erro ao carregar modelos:", error);
        }
    };

    const salvarModeloAtual = async () => {
        if (!valor.trim()) {
            toast.error("Escreva algo antes de salvar como modelo.");
            return;
        }
        setSalvandoModelo(true);
        try {
            const { error } = await supabase
                .from("cris_tech_modelos_observacao")
                .insert({
                    texto: valor.trim(),
                    criado_por: usuario?.id,
                });

            if (error) throw error;
            toast.success("Modelo salvo com sucesso!");
            carregarModelos();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar modelo.");
        } finally {
            setSalvandoModelo(false);
        }
    };

    const excluirModelo = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Evita selecionar o modelo ao clicar em excluir
        try {
            const { error } = await supabase
                .from("cris_tech_modelos_observacao")
                .delete()
                .eq("id", id);
            if (error) throw error;
            toast.success("Modelo excluído!");
            carregarModelos();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao excluir modelo.");
        }
    };

    const aplicarModelo = (texto: string) => {
        onChange(texto);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-sm font-medium text-[#9CA3AF] uppercase tracking-wider">
                    {label}
                </label>
                {modelos.length > 0 && (
                    <div className="relative">
                        <select
                            className="w-full sm:w-auto rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-1.5 text-xs text-[#9CA3AF] hover:text-white transition-colors cursor-pointer appearance-none max-w-[200px]"
                            onChange={(e) => {
                                if (e.target.value) {
                                    aplicarModelo(e.target.value);
                                    e.target.value = ""; // Resetar para permitir selecionar o mesmo novamente
                                }
                            }}
                            defaultValue=""
                        >
                            <option value="" disabled>Preencher com modelo...</option>
                            {modelos.map((m) => (
                                <option key={m.id} value={m.texto} title={m.texto}>
                                    {m.texto.length > 30 ? m.texto.substring(0, 30) + "..." : m.texto}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="relative">
                <Textarea
                    value={valor}
                    onChange={(e) => onChange(e.target.value)}
                    maxLength={275}
                    rows={4}
                    placeholder={placeholder}
                    className="resize-none"
                />
                <div className="absolute -bottom-6 left-0 flex items-center gap-2">
                    {valor.trim().length > 0 && (
                        <button
                            type="button"
                            onClick={salvarModeloAtual}
                            disabled={salvandoModelo}
                            className="text-[10px] text-[#CC0000] hover:underline disabled:opacity-50"
                        >
                            {salvandoModelo ? "Salvando..." : "Salvar texto atual como modelo"}
                        </button>
                    )}
                </div>
                <p className="absolute -bottom-6 right-0 text-xs text-[#6B7280]">
                    <span className={valor.length >= 275 ? "text-red-400" : ""}>
                        {valor.length}
                    </span>
                    /275 caracteres
                </p>
            </div>

            {modelos.length > 0 && (
                <div className="pt-8">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase mb-2">Seus Modelos Salvos:</p>
                    <div className="flex flex-wrap gap-2">
                        {modelos.map(m => (
                            <div key={m.id} className="flex items-center gap-1 rounded border border-[#1E1E1E] bg-[#111111] px-2 py-1">
                                <button
                                    type="button"
                                    onClick={() => aplicarModelo(m.texto)}
                                    className="text-xs text-[#9CA3AF] hover:text-white transition text-left"
                                    title={m.texto}
                                >
                                    {m.texto.length > 20 ? m.texto.substring(0, 20) + "..." : m.texto}
                                </button>
                                {(usuario?.role === 'master' || usuario?.id === m.criado_por) && (
                                    <button
                                        type="button"
                                        onClick={(e) => excluirModelo(m.id, e)}
                                        className="ml-2 text-[#4B5563] hover:text-red-400 p-0.5"
                                        title="Excluir modelo"
                                    >
                                        x
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
