import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { tenantFromHost } from "@/lib/tenants";
import { PORTAL_COOKIE, makePortalToken, passwordEnvKey } from "@/lib/tenant-auth";
import { absoluteUrl, sameOrigin } from "@/lib/portal-http";

// 暴力破解緩衝：per-IP 失敗計數（同一進程內）
const attempts = new Map<string, { fails: number; lockUntil: number }>();
const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  // 租戶由 Host 決定：/portal 沒有經過 proxy 改寫，這裡是唯一的判定點
  const tenant = tenantFromHost(req.headers.get("host"));
  if (!tenant) return new NextResponse("Not Found", { status: 404 });
  if (!sameOrigin(req)) return new NextResponse("Bad Request", { status: 400 });

  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const now = Date.now();

  if (attempts.size > 500) {
    for (const [k, v] of attempts) if (v.lockUntil < now && v.fails === 0) attempts.delete(k);
  }

  // 鎖定以「租戶＋IP」為 key：攻擊 A 站不會連帶鎖住 B 站的客戶
  const key = `${tenant.slug}:${clientIp(req)}`;
  const rec = attempts.get(key) ?? { fails: 0, lockUntil: 0 };
  if (now < rec.lockUntil) {
    return NextResponse.redirect(absoluteUrl(req, "/portal?error=locked"), 303);
  }

  const expected = process.env[passwordEnvKey(tenant.slug)] ?? "";
  const a = crypto.createHash("sha256").update(password).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  const ok = expected.length > 0 && crypto.timingSafeEqual(a, b);

  if (!ok) {
    rec.fails += 1;
    if (rec.fails >= MAX_FAILS) {
      rec.lockUntil = now + LOCK_MS;
      rec.fails = 0;
    }
    attempts.set(key, rec);
    // 見 api/admin/login 的說明：303 讓失敗在 nginx log 裡無法辨識，
    // 這行是 fail2ban（avalo-auth jail）與每日簡報唯一的偵測來源。
    console.warn(`[auth fail] portal:${tenant.slug} ip=${clientIp(req)}`);
    return NextResponse.redirect(absoluteUrl(req, "/portal?error=1"), 303);
  }

  attempts.delete(key);
  const { token, maxAge } = makePortalToken(tenant.slug);
  const res = NextResponse.redirect(absoluteUrl(req, "/portal"), 303);
  res.cookies.set(PORTAL_COOKIE, token, {
    httpOnly: true,
    // 不設 domain → host-only cookie，瀏覽器不會把它送到別家客戶的子網域。
    // 隔離靠的是 host-only，不是 path；path 必須是 "/"，否則 /api/portal/* 收不到
    // cookie（cookie path 是路徑前綴比對，"/api/portal/handle" 不在 "/portal" 底下）。
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    path: "/",
  });
  return res;
}
