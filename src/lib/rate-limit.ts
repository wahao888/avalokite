import { NextRequest } from "next/server";

// 簡易 in-memory rate limit（單機 node 部署，夠用）。重啟即清空，接受。
const hits = new Map<string, number[]>();

/**
 * 限流用的來源 IP。
 *
 * ⚠ 不能讀 X-Forwarded-For 的第一段。nginx 設的是
 *   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
 * 那個變數會把**客戶端自己送來的 XFF** 接在前面，再補上真實 IP，所以第一段
 * 是攻擊者說了算的——每則請求換一個假 IP 就能把應用層限流整個繞過去。
 *
 * 改讀 X-Real-IP：nginx 是用 $remote_addr 覆寫它，客戶端蓋不掉。
 * 沒有它時退回 XFF 的**最後**一段，那是最靠近我們的那一跳補上的。
 * 兩者都沒有就是直連（本機開發），用 unknown 共用一個桶子即可。
 */
export function clientIp(req: NextRequest): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const chain = req.headers.get("x-forwarded-for")?.split(",") ?? [];
  return chain[chain.length - 1]?.trim() || "unknown";
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
