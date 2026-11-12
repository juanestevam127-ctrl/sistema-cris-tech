import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const AUTH_SECRET = process.env.AUTH_SECRET || "cris-tech-secret-nocodb-key-2026-safe";
const SECRET_KEY = new TextEncoder().encode(AUTH_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("cris_tech_session")?.value;

  let user: any = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      user = payload;
    } catch {
      user = null;
    }
  }

  // Redireciona usuários logados que tentam acessar a tela de login
  if (pathname === "/login") {
    if (user) {
      return NextResponse.redirect(new URL("/operacao", request.url));
    }
    return NextResponse.next();
  }

  // Se não autenticado e rota protegida, redireciona para login
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
