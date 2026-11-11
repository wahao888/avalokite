import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { saveKnowledge } from "@/lib/chat-stats";
import { getTenant } from "@/lib/tenants";

// 客戶站的知識庫編輯。主站沒有這一頁——它的知識庫是從 products.ts 當場算的，
// 真要在這裡蓋掉它，只會多出一份跟價目表對不上的舊資料。
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const form = await req.formData();
  const tenantId = String(form.get("tenantId") ?? "");
  const content = String(form.get("content") ?? "");

  // 只接受「真的有買 AI 客服」的站，避免手滑建出永遠不會被讀到的資料列
  if (!getTenant(tenantId)?.aiSupport) {
    return NextResponse.redirect(`${site}/admin/chat?kberr=1`, 303);
  }
  await saveKnowledge(tenantId, content);
  return NextResponse.redirect(`${site}/admin/chat?kbok=1`, 303);
}
