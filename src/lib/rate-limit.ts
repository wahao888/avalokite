import { NextRequest } from "next/server";

// 簡易 in-memory rate limit（單機 node 部署，夠用）。重啟即清空，接受。
const hits = new Map<string, number[]>();

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export function rateLimited(
  key: string,
  { windowMs, max }: { windowMs: number; max: number }
): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return true;
  }
  arr.push(now);
  hits.set(key, arr);
  // 防止 Map 無限增長
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return false;
}
