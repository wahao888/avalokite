import { NextRequest, NextResponse } from "next/server";
import { PORTAL_COOKIE } from "@/lib/tenant-auth";
import { absoluteUrl, sameOrigin } from "@/lib/portal-http";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Bad Request", { status: 400 });
  const res = NextResponse.redirect(absoluteUrl(req, "/portal"), 303);
  // path 必須與登入時設定的一致，否則清不掉
  res.cookies.set(PORTAL_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
