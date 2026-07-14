import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ADMIN_COOKIE, makeSessionToken } from "@/lib/admin-auth";

// 暴力破解緩衝：per-IP 失敗計數（同一進程內），避免單一攻擊者鎖住所有人
const attempts = new Map<string, { fails: number; lockUntil: number }>();
const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim(); // Nginx 反向代理帶入
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const now = Date.now();

  // 輕量清理過期紀錄，避免 Map 無限成長
  if (attempts.size > 500) {
    for (const [k, v] of attempts) if (v.lockUntil < now && v.fails === 0) attempts.delete(k);
  }

  const ip = clientIp(req);
  const rec = attempts.get(ip) ?? { fails: 0, lockUntil: 0 };

  if (now < rec.lockUntil) {
    return NextResponse.redirect(`${site}/admin?error=locked`, 303);
  }

  const expected = process.env.ADMIN_PASSWORD ?? "";
  const a = crypto.createHash("sha256").update(password).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  const ok = expected.length > 0 && crypto.timingSafeEqual(a, b);

  if (!ok) {
    rec.fails += 1;
    if (rec.fails >= MAX_FAILS) {
      rec.lockUntil = now + LOCK_MS; // 鎖 10 分鐘
      rec.fails = 0;
    }
    attempts.set(ip, rec);
    return NextResponse.redirect(`${site}/admin?error=1`, 303);
  }

  attempts.delete(ip); // 成功即清除該 IP 的失敗紀錄
  const { token, maxAge } = makeSessionToken();
  const res = NextResponse.redirect(`${site}/admin`, 303);
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict", // 後台皆為狀態變更操作，禁止任何跨站帶 cookie（防 CSRF）
    secure: process.env.NODE_ENV === "production",
    maxAge,
    path: "/",
  });
  return res;
}
