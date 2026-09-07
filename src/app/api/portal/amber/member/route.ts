import { NextRequest, NextResponse } from "next/server";

import { getTenantSession } from "@/lib/tenant-auth";
import { absoluteUrl, sameOrigin } from "@/lib/portal-http";
import { mergeMembers, updateMember } from "@/lib/daigou-data";

// 會員合併與備註。
//
// 合併一定會用到：老客人換號碼、幫家人代訂、打錯一碼。發生的時候她會看到
// 「同一個人有兩張結單、運費收了兩次」。
//
// from 那一列**保留**並寫上 mergedIntoId（不刪，才查得出當初併過），
// 手機號碼讓出來，否則唯一鍵會擋住 into 日後改號。

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Bad Request", { status: 400 });

  const tenant = await getTenantSession();
  if (!tenant) return new NextResponse("Unauthorized", { status: 401 });
  if (!tenant.daigou) return new NextResponse("Not Found", { status: 404 });

  const form = await req.formData();
  const action = String(form.get("action") ?? "");

  if (action === "merge") {
    const fromId = String(form.get("fromId") ?? "").trim();
    const intoId = String(form.get("intoId") ?? "").trim();
    if (!fromId || !intoId || fromId === intoId) {
      return NextResponse.redirect(absoluteUrl(req, "/portal/amber/members?error=bad"), 303);
    }
    const ok = await mergeMembers(tenant.slug, fromId, intoId);
    return NextResponse.redirect(
      absoluteUrl(req, ok ? "/portal/amber/members?merged=1" : "/portal/amber/members?error=notfound"),
      303,
    );
  }

  if (action === "note") {
    const id = String(form.get("id") ?? "").trim();
    if (!id) return NextResponse.redirect(absoluteUrl(req, "/portal/amber/members?error=bad"), 303);
    await updateMember(tenant.slug, id, {
      note: String(form.get("note") ?? "").trim() || null,
      blocked: form.get("blocked") === "on",
    });
    return NextResponse.redirect(absoluteUrl(req, "/portal/amber/members"), 303);
  }

  return NextResponse.redirect(absoluteUrl(req, "/portal/amber/members?error=bad"), 303);
}
