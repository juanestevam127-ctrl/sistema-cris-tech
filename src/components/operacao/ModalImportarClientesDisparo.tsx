"use client";

import { useState, useRef, useId } from "react";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle, ArrowRight, Table } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";

interface ModalImportarClientesDisparoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface LinhaCSV {
  raw: string[];
  nome: string;
  telefoneRaw: string;
  telefoneFormatado: string;
  valido: boolean;
  motivoInvalido?: string;
}

// Parser simples e robusto de CSV suportando aspas e múltiplos delimitadores (, ou ;)
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  // Detectar delimitador provável examinando as primeiras linhas
  const firstLine = cleanText.split("\n")[0] || "";
  const countComma = (firstLine.match(/,/g) || []).length;
  const countSemicolon = (firstLine.match(/;/g) || []).length;
  const countTab = (firstLine.match(/\t/g) || []).length;
  let delimiter = ",";
  if (countSemicolon > countComma && countSemicolon >= countTab) delimiter = ";";
  else if (countTab > countComma && countTab > countSemicolon) delimiter = "\t";

  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // pular quote escapado
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        if (currentRow.some((field) => field.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

// Normaliza telefone para formato 55DDDNÚMERO
function normalizarTelefone(val: string): { valido: boolean; telefoneFinal: string; motivo?: string } {
  if (!val) return { valido: false, telefoneFinal: "", motivo: "Telefone vazio" };

  let digits = val.replace(/\D/g, "");

  // Se já começar com 55 e tiver 12 ou 13 dígitos (55 + DDD 2 dígitos + 8 ou 9 dígitos)
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return { valido: true, telefoneFinal: digits };
  }

  // Se tiver 10 dígitos (DDD + 8 dígitos) ou 11 dígitos (DDD + 9 dígitos)
  if (digits.length === 10 || digits.length === 11) {
    return { valido: true, telefoneFinal: "55" + digits };
  }

  // Se começar com 0 (ex: 011988887777), remove o zero inicial
  if (digits.startsWith("0") && (digits.length === 11 || digits.length === 12)) {
    digits = digits.substring(1);
    return { valido: true, telefoneFinal: "55" + digits };
  }

  return {
    valido: false,
    telefoneFinal: digits,
    motivo: `Qtd de dígitos inválida (${digits.length} dígitos encontrados). Esperado DDD + número.`,
  };
}

export function ModalImportarClientesDisparo({
  isOpen,
  onClose,
  onSuccess,
}: ModalImportarClientesDisparoProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "map" | "preview">("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);

  // Mapeamento de colunas
  const [nomeCol, setNomeCol] = useState<number | -1>(-1);
  const [telefoneCol, setTelefoneCol] = useState<number | -1>(-1);

  const [linhasProcessadas, setLinhasProcessadas] = useState<LinhaCSV[]>([]);
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });

  const resetState = () => {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setNomeCol(-1);
    setTelefoneCol(-1);
    setLinhasProcessadas([]);
    setImportando(false);
    setProgresso({ atual: 0, total: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (importando) return;
    resetState();
    onClose();
  };

  if (!isOpen) return null;

  // Leitura do arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Por favor, selecione um arquivo no formato CSV (.csv).");
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          toast.error("O arquivo selecionado está vazio.");
          return;
        }

        const parsed = parseCSV(text);
        if (parsed.length < 2) {
          toast.error("O arquivo precisa conter ao menos uma linha de cabeçalho e uma linha de dados.");
          return;
        }

        const headerRow = parsed[0];
        const dataRows = parsed.slice(1);

        setHeaders(headerRow);
        setRows(dataRows);

        // Auto-detectar colunas por palavras-chave comuns
        let autoNome = -1;
        let autoTel = -1;
        headerRow.forEach((h, idx) => {
          const lower = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (autoNome === -1 && (lower.includes("nome") || lower.includes("cliente") || lower.includes("name") || lower.includes("contato"))) {
            autoNome = idx;
          }
          if (autoTel === -1 && (lower.includes("tel") || lower.includes("cel") || lower.includes("whats") || lower.includes("fone") || lower.includes("phone"))) {
            autoTel = idx;
          }
        });

        setNomeCol(autoNome !== -1 ? autoNome : 0);
        setTelefoneCol(autoTel !== -1 ? autoTel : (headerRow.length > 1 ? 1 : 0));

        setStep("map");
      } catch (err) {
        console.error(err);
        toast.error("Erro ao ler o arquivo CSV.");
      }
    };

    reader.readAsText(file, "UTF-8");
  };

  // Avançar do mapeamento para o preview
  const handleGerarPreview = () => {
    if (nomeCol === -1 || telefoneCol === -1) {
      toast.error("Selecione qual coluna é o Nome e qual é o Telefone.");
      return;
    }

    if (nomeCol === telefoneCol) {
      toast.error("A coluna de Nome e Telefone devem ser diferentes.");
      return;
    }

    const processadas: LinhaCSV[] = rows.map((r) => {
      const nomeVal = (r[nomeCol] || "").trim();
      const telVal = (r[telefoneCol] || "").trim();
      const norm = normalizarTelefone(telVal);

      let valido = norm.valido && nomeVal.length > 0;
      let motivo = norm.motivo;
      if (!nomeVal && valido) {
        valido = false;
        motivo = "Nome em branco";
      }

      return {
        raw: r,
        nome: nomeVal || "(Sem Nome)",
        telefoneRaw: telVal,
        telefoneFormatado: norm.telefoneFinal,
        valido,
        motivoInvalido: motivo,
      };
    });

    setLinhasProcessadas(processadas);
    setStep("preview");
  };

  // Executar a importação para o Supabase
  const handleImportar = async () => {
    const validas = linhasProcessadas.filter((l) => l.valido);
    if (validas.length === 0) {
      toast.error("Nenhum registro válido para importar.");
      return;
    }

    setImportando(true);
    setProgresso({ atual: 0, total: validas.length });

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id || null;

      // Inserção em lotes de 100 para alta performance
      const BATCH_SIZE = 100;
      let inseridos = 0;

      for (let i = 0; i < validas.length; i += BATCH_SIZE) {
        const batch = validas.slice(i, i + BATCH_SIZE).map((l) => ({
          nome: l.nome,
          telefone: l.telefoneFormatado,
          criado_por: userId,
        }));

        const { error } = await supabase.from("cris_tech_clientes_disparo").insert(batch);
        if (error) throw error;

        inseridos += batch.length;
        setProgresso({ atual: inseridos, total: validas.length });
      }

      toast.success(`${inseridos} cliente(s) importado(s) com sucesso!`);
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao importar clientes.");
    } finally {
      setImportando(false);
    }
  };

  const totalValidos = linhasProcessadas.filter((l) => l.valido).length;
  const totalInvalidos = linhasProcessadas.filter((l) => !l.valido).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-[#1E1E1E] bg-[#111111] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E1E1E] px-6 py-4 bg-[#0D0D0D]">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-[#CC0000]" />
            <div>
              <h2 className="text-lg font-bold text-white">Importar Clientes via Planilha CSV</h2>
              <p className="text-xs text-[#9CA3AF]">
                {step === "upload" && "Envie um arquivo .csv para cadastrar contatos em lote"}
                {step === "map" && "Selecione as colunas de Nome e Telefone correspondentes"}
                {step === "preview" && "Revise os contatos identificados antes de confirmar"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={importando}
            className="text-[#9CA3AF] hover:text-white transition disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* ETAPA 1: UPLOAD */}
          {step === "upload" && (
            <div className="space-y-4">
              <label
                htmlFor={fileInputId}
                className="flex flex-col items-center justify-center border-2 border-dashed border-[#2A2A2A] hover:border-[#CC0000] rounded-xl p-10 cursor-pointer bg-[#141414] hover:bg-[#181818] transition text-center group"
              >
                <div className="h-14 w-14 rounded-full bg-[#1F1F1F] group-hover:bg-[#CC0000]/20 flex items-center justify-center mb-4 text-[#9CA3AF] group-hover:text-[#CC0000] transition">
                  <Upload size={26} />
                </div>
                <p className="text-sm font-semibold text-white mb-1">
                  Clique para selecionar sua planilha CSV
                </p>
                <p className="text-xs text-[#9CA3AF]">
                  Suporta arquivos .csv exportados do Excel, Google Sheets, WhatsApp, etc.
                </p>
                <input
                  id={fileInputId}
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <div className="rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] p-4 text-xs text-[#9CA3AF] space-y-1.5">
                <p className="font-semibold text-white">💡 Dicas para a planilha:</p>
                <p>• A primeira linha do arquivo deve ser o cabeçalho (ex: Nome, Telefone).</p>
                <p>• Os números de telefone podem ter pontuação, parênteses ou traços (o sistema limpa e padroniza com 55 automaticamente).</p>
                <p>• Se a sua planilha estiver em Excel (.xlsx), salve-a como <strong>CSV (separado por vírgulas ou ponto e vírgula)</strong>.</p>
              </div>
            </div>
          )}

          {/* ETAPA 2: MAPEAMENTO DE COLUNAS */}
          {step === "map" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border border-[#1E1E1E] bg-[#161616] px-4 py-2.5">
                <span className="text-xs text-[#9CA3AF]">Arquivo carregado:</span>
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <FileSpreadsheet size={14} className="text-[#CC0000]" />
                  {fileName} ({rows.length} linhas encontradas)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Coluna Nome */}
                <div className="rounded-xl border border-[#1E1E1E] bg-[#141414] p-4 space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                    Coluna do Nome *
                  </label>
                  <select
                    value={nomeCol}
                    onChange={(e) => setNomeCol(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
                  >
                    <option value={-1} disabled>Selecione a coluna...</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        Coluna {idx + 1}: {h || `(Sem título)`}
                      </option>
                    ))}
                  </select>
                  {nomeCol !== -1 && rows[0] && (
                    <p className="text-[11px] text-[#6B7280] truncate">
                      Exemplo 1ª linha: <span className="text-[#9CA3AF] font-medium">{rows[0][nomeCol] || "—"}</span>
                    </p>
                  )}
                </div>

                {/* Coluna Telefone */}
                <div className="rounded-xl border border-[#1E1E1E] bg-[#141414] p-4 space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                    Coluna do Telefone *
                  </label>
                  <select
                    value={telefoneCol}
                    onChange={(e) => setTelefoneCol(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
                  >
                    <option value={-1} disabled>Selecione a coluna...</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        Coluna {idx + 1}: {h || `(Sem título)`}
                      </option>
                    ))}
                  </select>
                  {telefoneCol !== -1 && rows[0] && (
                    <p className="text-[11px] text-[#6B7280] truncate">
                      Exemplo 1ª linha: <span className="text-[#9CA3AF] font-medium">{rows[0][telefoneCol] || "—"}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Prévia dos primeiros dados */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
                  <Table size={13} /> Prévia das primeiras 3 linhas do arquivo:
                </span>
                <div className="overflow-x-auto rounded-lg border border-[#1E1E1E] bg-[#0D0D0D]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1E1E1E] bg-[#141414]">
                        {headers.map((h, idx) => (
                          <th
                            key={idx}
                            className={`px-3 py-2 text-left font-semibold ${
                              idx === nomeCol
                                ? "text-[#CC0000] bg-[#CC0000]/10"
                                : idx === telefoneCol
                                ? "text-emerald-400 bg-emerald-500/10"
                                : "text-[#9CA3AF]"
                            }`}
                          >
                            {h || `Col ${idx + 1}`}
                            {idx === nomeCol && " (Nome)"}
                            {idx === telefoneCol && " (Telefone)"}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 3).map((r, rIdx) => (
                        <tr key={rIdx} className="border-b border-[#1A1A1A] last:border-0 text-[#9CA3AF]">
                          {headers.map((_, cIdx) => (
                            <td
                              key={cIdx}
                              className={`px-3 py-2 ${
                                cIdx === nomeCol
                                  ? "text-white font-medium bg-[#CC0000]/5"
                                  : cIdx === telefoneCol
                                  ? "text-white font-medium bg-emerald-500/5"
                                  : ""
                              }`}
                            >
                              {r[cIdx] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 3: PREVIEW & VALIDAÇÃO */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Cards de Resumo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-900/30 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <span className="text-lg font-bold text-emerald-400">{totalValidos}</span>
                    <p className="text-xs text-emerald-300/80">Prontos para importar</p>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-900/30 text-amber-400 flex items-center justify-center shrink-0">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <span className="text-lg font-bold text-amber-400">{totalInvalidos}</span>
                    <p className="text-xs text-amber-300/80">Ignorados (inválidos)</p>
                  </div>
                </div>
              </div>

              {/* Tabela de revisão */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-[#9CA3AF]">
                  Amostra dos contatos processados:
                </span>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-[#1E1E1E] bg-[#0D0D0D]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#161616] border-b border-[#1E1E1E]">
                      <tr>
                        <th className="px-3 py-2 text-left text-[#9CA3AF]">Status</th>
                        <th className="px-3 py-2 text-left text-[#9CA3AF]">Nome</th>
                        <th className="px-3 py-2 text-left text-[#9CA3AF]">Telefone Original</th>
                        <th className="px-3 py-2 text-left text-[#9CA3AF]">Salvo como (55...)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A1A1A]">
                      {linhasProcessadas.slice(0, 50).map((linha, idx) => (
                        <tr key={idx} className={linha.valido ? "hover:bg-[#141414]" : "bg-red-950/10 text-red-300"}>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {linha.valido ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                                <CheckCircle2 size={12} /> Válido
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-400" title={linha.motivoInvalido}>
                                <AlertTriangle size={12} /> {linha.motivoInvalido || "Inválido"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-white font-medium truncate max-w-[140px]">
                            {linha.nome}
                          </td>
                          <td className="px-3 py-2 text-[#9CA3AF] font-mono">
                            {linha.telefoneRaw || "—"}
                          </td>
                          <td className="px-3 py-2 text-emerald-400 font-mono">
                            {linha.valido ? `+${linha.telefoneFormatado}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {linhasProcessadas.length > 50 && (
                  <p className="text-[11px] text-[#6B7280] text-center">
                    Exibindo os primeiros 50 contatos de {linhasProcessadas.length} encontrados.
                  </p>
                )}
              </div>

              {/* Barra de progresso durante importação */}
              {importando && (
                <div className="space-y-1.5 rounded-lg border border-[#1E1E1E] bg-[#141414] p-3">
                  <div className="flex justify-between text-xs text-[#9CA3AF]">
                    <span>Importando clientes para o banco...</span>
                    <span className="font-semibold text-white">
                      {progresso.atual} de {progresso.total}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#222] overflow-hidden">
                    <div
                      className="h-full bg-[#CC0000] transition-all duration-200"
                      style={{
                        width: `${progresso.total ? (progresso.atual / progresso.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#1E1E1E] px-6 py-4 bg-[#0D0D0D]">
          {step === "upload" && (
            <div className="flex justify-end w-full">
              <Button variant="secondary" onClick={handleClose}>
                Cancelar
              </Button>
            </div>
          )}

          {step === "map" && (
            <>
              <Button variant="secondary" onClick={() => setStep("upload")}>
                Voltar
              </Button>
              <Button variant="primary" onClick={handleGerarPreview} className="flex items-center gap-1.5">
                Continuar para Revisão <ArrowRight size={15} />
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button variant="secondary" onClick={() => setStep("map")} disabled={importando}>
                Alterar Colunas
              </Button>
              <Button
                variant="primary"
                onClick={handleImportar}
                disabled={importando || totalValidos === 0}
                className="flex items-center gap-1.5"
              >
                {importando ? "Importando..." : `Confirmar e Importar (${totalValidos})`}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
