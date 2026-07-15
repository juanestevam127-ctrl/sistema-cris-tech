import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const agora = new Date().toISOString();

    // Query pending posts that are due
    const { data: posts, error } = await supabaseAdmin
      .from("cris_tech_postagens_agendadas")
      .select("*")
      .eq("status", "pendente")
      .lte("agendado_para", agora);

    if (error) {
      console.error("Erro ao buscar postagens:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ message: "Nenhuma postagem pendente para disparar." });
    }

    const results = [];

    for (const post of posts) {
      try {
        const payload = {
          tipo_publicacao: post.tipo_publicacao,
          tipo_midia: post.tipo_midia,
          legenda: post.legenda,
          disparar_agora: true,
          agendado_para: post.agendado_para,
          midias: post.midias,
        };

        const res = await fetch("https://criadordigital-n8n-webhook.5rqumh.easypanel.host/webhook/postagem-insta-cristech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          await supabaseAdmin
            .from("cris_tech_postagens_agendadas")
            .update({ status: "concluido", updated_at: new Date().toISOString() })
            .eq("id", post.id);
          results.push({ id: post.id, status: "sucesso" });
        } else {
          const text = await res.text();
          throw new Error(`Webhook respondeu com erro: ${text}`);
        }
      } catch (err: any) {
        await supabaseAdmin
          .from("cris_tech_postagens_agendadas")
          .update({
            status: "erro",
            erro_mensagem: err.message || "Erro desconhecido",
            updated_at: new Date().toISOString(),
          })
          .eq("id", post.id);
        results.push({ id: post.id, status: "erro", erro: err.message });
      }
    }

    return NextResponse.json({ processed: results });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
