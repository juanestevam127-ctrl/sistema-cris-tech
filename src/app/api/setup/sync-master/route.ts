import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MASTER_EMAIL = "juanestevam19@outlook.com";
const MASTER_NOME = "Juan Estevam";

/**
 * Sincroniza o usuário master do Auth com cris_tech_usuarios.
 * Use quando o usuário foi criado no Supabase Auth (manual ou outro método)
 * mas não existe ou está desatualizado em cris_tech_usuarios.
 */
export async function POST() {
  try {
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });
    const user = listData?.users?.find(
      (u) => u.email?.toLowerCase() === MASTER_EMAIL.toLowerCase()
    );

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Usuário não encontrado no Supabase Auth. Crie primeiro em Authentication → Users.",
        },
        { status: 404 }
      );
    }

    // Remove qualquer registro com email correto mas id errado (evita conflito)
    await supabaseAdmin
      .from("cris_tech_usuarios")
      .delete()
      .eq("email", MASTER_EMAIL)
      .neq("id", user.id);

    const { error } = await supabaseAdmin.from("cris_tech_usuarios").upsert(
      {
        id: user.id,
        email: MASTER_EMAIL,
        nome: MASTER_NOME,
        role: "master",
      },
      { onConflict: "id" }
    );

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          hint: "Verifique se a tabela cris_tech_usuarios existe e tem as colunas corretas.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Master sincronizado! O id do Auth agora está em cris_tech_usuarios.",
      userId: user.id,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erro ao sincronizar." },
      { status: 500 }
    );
  }
}
