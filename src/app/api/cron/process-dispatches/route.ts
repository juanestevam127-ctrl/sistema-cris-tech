import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const agora = new Date().toISOString();

    // Query pending dispatches that are due
    const { data: dispatches, error } = await supabaseAdmin
      .from("cris_tech_disparos")
      .select("*")
      .eq("status", "pendente")
      .lte("agendado_para", agora);

    if (error) {
      console.error("Erro ao buscar disparos agendados:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!dispatches || dispatches.length === 0) {
      return NextResponse.json({ message: "Nenhum disparo agendado pendente para enviar." });
    }

    const results = [];

    for (const d of dispatches) {
      try {
        // Formata as quebras de linha com literal \n e remove caracteres extras se necessário
        const textoFormatado = d.texto ? d.texto.replace(/\r?\n/g, "\\n") : null;

        const payload = {
          tipo: d.tipo,
          texto: textoFormatado,
          imagem_url: (d.tipo === "texto_imagem" || d.tipo === "imagem") ? d.imagem_url : null,
          destinatario: d.destinatario || "grupo",
        };

        const res = await fetch("https://criadordigital-n8n-webhook.5rqumh.easypanel.host/webhook/disparo-grupos-cristech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          await supabaseAdmin
            .from("cris_tech_disparos")
            .update({ status: "enviado", erro_mensagem: null, updated_at: new Date().toISOString() })
            .eq("id", d.id);
          results.push({ id: d.id, status: "sucesso" });
        } else {
          const text = await res.text();
          throw new Error(`Webhook respondeu com erro: ${text}`);
        }
      } catch (err: any) {
        await supabaseAdmin
          .from("cris_tech_disparos")
          .update({
            status: "erro",
            erro_mensagem: err.message || "Erro desconhecido",
            updated_at: new Date().toISOString(),
          })
          .eq("id", d.id);
        results.push({ id: d.id, status: "erro", message: err.message });
      }
    }

    return NextResponse.json({ success: true, processed: results });
  } catch (error: any) {
    console.error("Erro no processamento do cron de disparos:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}
