import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Endpoint de diagnóstico para verificar o estado do usuário no banco
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get("email");

        if (!email) {
            return NextResponse.json({ error: "Email required" }, { status: 400 });
        }

        // 1. Buscar no Auth
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

        // 2. Buscar na tabela
        const { data: dbUser, error: dbError } = await supabaseAdmin
            .from("cris_tech_usuarios")
            .select("*")
            .eq("email", email)
            .maybeSingle();

        return NextResponse.json({
            auth: authUser ? {
                id: authUser.id,
                email: authUser.email,
                created_at: authUser.created_at
            } : null,
            database: dbUser || null,
            dbError: dbError?.message || null,
            idMatch: authUser && dbUser ? authUser.id === dbUser.id : null
        });

    } catch (error) {
        console.error("Erro no diagnóstico:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
