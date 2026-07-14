import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ADMIN_COOKIE, makeSessionToken } from "@/lib/admin-auth";

// 簡單暴力破解緩衝：同一進程內登入失敗計數
let failCount = 0;
let lockUntil = 0;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (Date.now() < lockUntil) {
    return NextResponse.redirect(`${site}/admin?error=locked`, 303);
  }

  const expected = process.env.ADMIN_PASSWORD ?? "";
  const a = crypto.createHash("sha256").update(password).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  const ok = expected.length > 0 && crypto.timingSafeEqual(a, b);

  if (!ok) {
    failCount += 1;
    if (failCount >= 5) {
      lockUntil = Date.now() + 10 * 60 * 1000; // 鎖 10 分鐘
      failCount = 0;
    }
    return NextResponse.redirect(`${site}/admin?error=1`, 303);
  }

  failCount = 0;
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
