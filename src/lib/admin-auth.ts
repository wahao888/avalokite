import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE = "avalo_admin";
const TTL_MS = 1000 * 60 * 60 * 8; // 8 小時

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("ADMIN_SESSION_SECRET not set");
  return s;
}

function sign(expiry: number): string {
  const mac = crypto.createHmac("sha256", secret()).update(String(expiry)).digest("hex");
  return `${expiry}.${mac}`;
}

export function makeSessionToken(): { token: string; maxAge: number } {
  const expiry = Date.now() + TTL_MS;
  return { token: sign(expiry), maxAge: TTL_MS / 1000 };
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [expiryStr, mac] = token.split(".");
  const expiry = Number(expiryStr);
  if (!expiry || expiry < Date.now() || !mac) return false;
  const expected = crypto
    .createHmac("sha256", secret())
    .update(String(expiry))
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE)?.value);
}

export const ADMIN_COOKIE = COOKIE;
