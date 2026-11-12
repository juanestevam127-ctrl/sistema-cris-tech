/**
 * Utilitários para Cloudflare R2 Storage
 * Upload de arquivos para o bucket R2 via Cloudflare API v4
 */

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CLOUDFLARE_R2_TOKEN = process.env.CLOUDFLARE_R2_TOKEN || "";
const CLOUDFLARE_R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET || "";
const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "").replace(/\/$/, "");

export async function uploadToR2(params: {
  key: string;
  buffer: Buffer;
  contentType: string;
}): Promise<string> {
  const { key, buffer, contentType } = params;

  // Sanitizar a key para URL path
  const sanitizedKey = key.startsWith("/") ? key.substring(1) : key;
  const encodedKey = sanitizedKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${CLOUDFLARE_R2_BUCKET}/objects/${encodedKey}`;

  const res = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_R2_TOKEN}`,
      "Content-Type": contentType,
      "Content-Length": String(buffer.byteLength),
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Erro ao enviar arquivo para Cloudflare R2 [${res.status}]: ${errorText}`);
  }

  // Retorna a URL pública acessível
  return `${R2_PUBLIC_URL}/${sanitizedKey}`;
}

export async function deleteFromR2(key: string): Promise<boolean> {
  const sanitizedKey = key.startsWith("/") ? key.substring(1) : key;
  const encodedKey = sanitizedKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${CLOUDFLARE_R2_BUCKET}/objects/${encodedKey}`;

  const res = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_R2_TOKEN}`,
    },
  });

  return res.ok;
}
