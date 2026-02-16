import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
    try {
        const { email, authId } = await request.json();

        if (!email || !authId) {
            return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
        }

        // 1. Tentar buscar por ID (mais rápido e correto)
        let { data: usuario, error: fetchError } = await supabaseAdmin
            .from("cris_tech_usuarios")
            .select("*")
            .eq("id", authId)
            .maybeSingle();

        // 2. Se não encontrou por ID, tentar por e-mail (ID Mismatch)
        if (!usuario) {
            console.log(`ID mismatch p/ ${email}. Tentando buscar por e-mail...`);
            const { data: byEmail } = await supabaseAdmin
                .from("cris_tech_usuarios")
                .select("*")
                .eq("email", email)
                .maybeSingle();

            if (byEmail) {
                console.info(`Sincronizando ID do perfil p/ ${email}...`);

                // Salvar dados atuais
                const updatedProfile = {
                    ...byEmail,
                    id: authId,
                    updated_at: new Date().toISOString()
                };

                // Deletar registro com ID antigo e inserir com novo
                await supabaseAdmin.from("cris_tech_usuarios").delete().eq("email", email);
                const { data: inserted, error: insertError } = await supabaseAdmin
                    .from("cris_tech_usuarios")
                    .insert(updatedProfile)
                    .select()
                    .single();

                if (insertError) {
                    console.error("Erro ao sincronizar perfil:", insertError);
                    return NextResponse.json({ error: "Erro ao sincronizar perfil" }, { status: 500 });
                }
                usuario = inserted;
            }
        }

        if (!usuario) {
            return NextResponse.json({ error: "Usuário não cadastrado no banco de dados." }, { status: 404 });
        }

        return NextResponse.json({ success: true, usuario });

    } catch (error) {
        console.error("Erro na verificação de login:", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
