import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  let d: Date;
  if (typeof date === "string") {
    // Se for apenas data (yyyy-mm-dd), adiciona meio-dia para evitar problemas de fuso
    const dateStr = date.includes("T") ? date : `${date}T12:00:00`;
    d = new Date(dateStr);
  } else {
    d = date;
  }
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

export function formatCpfCnpj(val: string | null | undefined): string {
  if (!val) return "";
  const v = val.replace(/\D/g, "");
  if (v.length <= 11) {
    return v
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return v
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatPhone(val: string | null | undefined): string {
  if (!val) return "";
  const v = val.replace(/\D/g, "");
  if (v.length <= 10) {
    return v.replace(/(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  return v.replace(/(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
}

export function formatCep(val: string | null | undefined): string {
  if (!val) return "";
  return val.replace(/\D/g, "").replace(/(\d{5})(\d)/, "$1-$2");
}
