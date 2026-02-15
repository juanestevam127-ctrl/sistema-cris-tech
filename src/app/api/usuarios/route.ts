import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { data: usuario } = await supabaseAdmin
      .from("cris_tech_usuarios")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!usuario || usuario.role !== "master") {
      return NextResponse.json(
        { error: "Somente master pode criar usuários." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, nome, role } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const roleValido = role === "admin" ? "admin" : "user";

    const { data: userData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: String(email).trim(),
        password: String(password),
        email_confirm: true,
      });

    if (authError) {
      return NextResponse.json(
        { error: authError.message ?? "Erro ao criar usuário." },
        { status: 400 }
      );
    }

    if (!userData.user?.id) {
      return NextResponse.json(
        { error: "Usuário criado mas ID não retornado." },
        { status: 500 }
      );
    }

    const { error: insertError } = await supabaseAdmin
      .from("cris_tech_usuarios")
      .insert({
        id: userData.user.id,
        email: String(email).trim(),
        nome: nome ? String(nome).trim() : null,
        role: roleValido,
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message ?? "Erro ao salvar usuário." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erro interno ao criar usuário." },
      { status: 500 }
    );
  }
}
