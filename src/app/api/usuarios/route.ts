import { NextRequest, NextResponse } from "next/server";
import { nocodb } from "@/lib/nocodb";
import { verifySessionToken } from "@/lib/auth";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("cris_tech_session")?.value;
    const sessionUser = token ? await verifySessionToken(token) : null;

    if (!sessionUser || sessionUser.role !== "master") {
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
    const cleanEmail = String(email).trim().toLowerCase();

    const novoUsuario = await nocodb.insert("cris_tech_usuarios", {
      id: crypto.randomUUID(),
      email: cleanEmail,
      nome: nome ? String(nome).trim() : null,
      role: roleValido,
      senha: String(password),
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, usuario: novoUsuario });
  } catch (err: any) {
    console.error("Erro ao criar usuário:", err);
    return NextResponse.json(
      { error: err.message ?? "Erro interno ao criar usuário." },
      { status: 500 }
    );
  }
}
