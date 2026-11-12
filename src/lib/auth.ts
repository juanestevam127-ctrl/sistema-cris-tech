import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";

const AUTH_SECRET = process.env.AUTH_SECRET || "cris-tech-secret-nocodb-key-2026-safe";
const SECRET_KEY = new TextEncoder().encode(AUTH_SECRET);

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

export interface UserSessionPayload {
  id: string;
  email: string;
  nome: string;
  role: string;
}

export async function createSessionToken(user: UserSessionPayload): Promise<string> {
  return await new SignJWT({
    id: user.id,
    email: user.email,
    nome: user.nome,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d") // 30 dias de sessão ativa
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      id: payload.id as string,
      email: payload.email as string,
      nome: payload.nome as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}
