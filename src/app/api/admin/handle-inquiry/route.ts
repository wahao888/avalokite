import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const form = await req.formData();
  const id = Number(form.get("id"));
  if (!id) return NextResponse.json({ error: "bad id" }, { status: 400 });
  await prisma.inquiry.update({ where: { id }, data: { handled: true } });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return NextResponse.redirect(`${site}/admin`, 303);
}
