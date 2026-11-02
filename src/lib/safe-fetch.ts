import { isIP } from "node:net";
import { resolve4, resolve6 } from "node:dns/promises";

/** 給 GEO 檢測用：禁止打進內網，避免把工具當 SSRF。 */
export function hostBlocked(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (!h || h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h === "metadata.google.internal" || h.endsWith(".nip.io")) return true;
  if (isIP(h) && ipPrivate(h)) return true;
  return false;
}

function ipPrivate(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) return true;
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const a = Number(m[1]), b = Number(m[2]);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export async function resolvePublic(hostname: string): Promise<string[]> {
  const records = [
    ...(await resolve4(hostname).catch(() => [] as string[])),
    ...(await resolve6(hostname).catch(() => [] as string[])),
  ];
  if (records.length === 0) throw new Error("unresolved");
  if (records.some(ipPrivate)) throw new Error("private");
  return records;
}

export async function fetchPublic(url: string, timeoutMs = 8000): Promise<{ status: number; text: string; finalUrl: string }> {
  const u = new URL(url);
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("protocol");
  if (hostBlocked(u.hostname)) throw new Error("blocked");
  await resolvePublic(u.hostname);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(u.toString(), {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": "AvaloGEO/1.0 (+https://avalokite.xyz/tools/geo)" },
    });
    const final = new URL(res.url);
    if (hostBlocked(final.hostname)) throw new Error("blocked");
    const text = await res.text();
    return { status: res.status, text: text.slice(0, 400_000), finalUrl: res.url };
  } finally {
    clearTimeout(t);
  }
}
