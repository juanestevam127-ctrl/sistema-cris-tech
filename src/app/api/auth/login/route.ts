import { NextRequest, NextResponse } from "next/server";
import { nocodb } from "@/lib/nocodb";
import { verifyPassword, createSessionToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // 1. Buscar usuário na tabela cris_tech_usuarios do NocoDB
    const usuarios = await nocodb.findMany("cris_tech_usuarios", {
      where: `(email,eq,${cleanEmail})`,
      limit: 1,
    });

    const user = usuarios[0];
    if (!user) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    // 2. Verificar senha (suporta senha real em texto ou senha_hash anterior)
    let senhaCorreta = false;
    if (user.senha) {
      senhaCorreta = user.senha === password;
    } else if (user.senha_hash) {
      senhaCorreta = verifyPassword(password, user.senha_hash);
    } else {
      return NextResponse.json(
        { error: "Usuário sem senha configurada." },
        { status: 401 }
      );
    }

    if (!senhaCorreta) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    // 3. Gerar JWT de Sessão
    const sessionToken = await createSessionToken({
      id: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role,
    });

    // 4. Gravar cookie seguro de autenticação
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role,
      },
    });

    response.cookies.set("cris_tech_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    });

    return response;
  } catch (error: any) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno ao realizar login." },
      { status: 500 }
    );
  }
}
