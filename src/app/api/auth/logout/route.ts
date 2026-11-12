import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Desconectado com sucesso." });
  response.cookies.delete("cris_tech_session");
  return response;
}
