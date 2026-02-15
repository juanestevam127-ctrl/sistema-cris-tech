import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MASTER_EMAIL = "juanestevam19@outlook.com";
const MASTER_PASSWORD = "Juan19022003@#";
const MASTER_NOME = "Juan Estevam";

export async function POST() {
  try {
    const { data: existing } = await supabaseAdmin
      .from("cris_tech_usuarios")
      .select("id")
      .eq("email", MASTER_EMAIL)
      .eq("role", "master")
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Master já existe. Use o login com as credenciais.",
      });
    }

    const { data: userData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: MASTER_EMAIL,
        password: MASTER_PASSWORD,
        email_confirm: true,
      });

    let userId: string;

    if (authError) {
      if (authError.message?.includes("already been registered")) {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const user = users?.users?.find((u) => u.email === MASTER_EMAIL);
        if (!user) {
          return NextResponse.json(
            { error: "Usuário existe mas não foi possível obter o ID." },
            { status: 500 }
          );
        }
        userId = user.id;
      } else {
        return NextResponse.json(
          { error: authError.message ?? "Erro ao criar usuário." },
          { status: 400 }
        );
      }
    } else if (userData?.user?.id) {
      userId = userData.user.id;
    } else {
      return NextResponse.json(
        { error: "Erro ao obter ID do usuário." },
        { status: 500 }
      );
    }

    const { error: insertError } = await supabaseAdmin
      .from("cris_tech_usuarios")
      .upsert(
        {
          id: userId,
          email: MASTER_EMAIL,
          nome: MASTER_NOME,
          role: "master",
        },
        { onConflict: "id" }
      );

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message ?? "Erro ao salvar em cris_tech_usuarios." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Usuário master criado! Faça login com juanestevam19@outlook.com",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erro interno ao criar master." },
      { status: 500 }
    );
  }
}
