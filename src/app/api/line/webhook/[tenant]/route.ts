import { NextRequest, NextResponse } from "next/server";
import { tenantCreds, lineConfigured } from "@/lib/line";
import { handleLineWebhook } from "@/lib/line-webhook";
import { getTenant } from "@/lib/tenants";

export const runtime = "nodejs";

/**
 * 客戶站的 LINE webhook：一個客戶一個網址。
 *
 *   https://avalokite.xyz/api/line/webhook/wenshan
 *
 * 為什麼用網址分而不是看 destination 欄位：destination 是 LINE 送來的資料，
 * 要先解析完才知道是誰，而簽章得用「那個客戶的 secret」才驗得起來——
 * 等於要先相信未驗證的內容才能決定怎麼驗證它。網址寫在客戶自己的
 * LINE Developers Console 上，是設定，不是別人送來的輸入。
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: slug } = await params;
  const tenant = getTenant(slug);

  // 沒有這個站、或這個站沒買 AI 客服：回 401 而不是 404。
  // 404 會告訴對方「這個 slug 不存在」，等於送他一份客戶名單。
  if (!tenant?.aiSupport) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const creds = tenantCreds(tenant);
  if (!lineConfigured(creds)) {
    console.warn(`[line/webhook] ${slug} 的 LINE 憑證沒設定，webhook 一律 401`);
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  return handleLineWebhook(req, { tenantId: slug, creds });
}
