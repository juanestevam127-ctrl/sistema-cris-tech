import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Endereço de reparo de ID.
 * Quando um usuário loga com sucesso no Auth, mas o ID dele no banco (cris_tech_usuarios)
 * está diferente (comum em migrações ou criações manuais), este endpoint
 * atualiza o registro do banco para bater com o ID real do Auth.
 */
export async function POST(request: Request) {
    try {
        const { email, authId } = await request.json();

        if (!email || !authId) {
            return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
        }

        // 1. Verificar se o registro existe com o e-mail mas com ID diferente
        const { data: profileByEmail, error: fetchError } = await supabaseAdmin
            .from("cris_tech_usuarios")
            .select("*")
            .eq("email", email)
            .single();

        if (fetchError || !profileByEmail) {
            return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
        }

        // Se o ID já estiver certo, não precisa fazer nada
        if (profileByEmail.id === authId) {
            return NextResponse.json({ success: true, message: "ID já sincronizado" });
        }

        // 2. Atualizar o ID. 
        // Como o ID é PK, precisamos deletar o antigo e inserir o novo com os mesmos dados,
        // ou fazer um update se o Supabase permitir (o que pode falhar se houver FKs).
        // A estratégia mais segura de 'upsert' com substituição:

        const newProfile = {
            ...profileByEmail,
            id: authId,
            updated_at: new Date().toISOString()
        };

        // Deletar o registro com ID antigo (usando e-mail para garantir)
        await supabaseAdmin
            .from("cris_tech_usuarios")
            .delete()
            .eq("email", email);

        // Inserir o novo registro com o ID correto
        const { error: insertError } = await supabaseAdmin
            .from("cris_tech_usuarios")
            .insert(newProfile);

        if (insertError) {
            console.error("Erro ao reinserir perfil:", insertError);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "ID sincronizado com sucesso",
            newId: authId
        });

    } catch (error) {
        console.error("Erro no reparo de ID:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
