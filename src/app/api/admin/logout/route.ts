import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-auth";

export async function POST() {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const res = NextResponse.redirect(`${site}/admin`, 303);
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
