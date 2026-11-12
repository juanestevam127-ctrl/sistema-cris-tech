import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";

const MAX_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/mpeg",
  "video/x-matroska",
  "video/webm",
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const layoutId = (formData.get("layoutId") as string | null) || "geral";

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo é obrigatório." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Arquivo deve ter no máximo 100MB." },
        { status: 400 }
      );
    }

    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "Use imagens (JPG, PNG, WEBP) ou vídeos (MP4, MOV)." },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `uploads/${layoutId}/${Date.now()}_${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const publicUrl = await uploadToR2({
      key,
      buffer,
      contentType: file.type,
    });

    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    console.error("Erro no upload R2:", e);
    return NextResponse.json(
      { error: e.message || "Erro interno ao fazer upload no R2." },
      { status: 500 }
    );
  }
}
