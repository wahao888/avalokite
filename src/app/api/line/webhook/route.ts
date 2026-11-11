import { NextRequest } from "next/server";
import { houseCreds } from "@/lib/line";
import { handleLineWebhook } from "@/lib/line-webhook";
import { HOUSE_TENANT } from "@/lib/tenants";

// 這條路由永遠要跑在 Node 執行環境：簽章驗證用的是 node:crypto。
export const runtime = "nodejs";

/**
 * Avalo 自己那支官方帳號（@958nplck）的 webhook。
 * 客戶站各自走 /api/line/webhook/<slug>，憑證與對話紀錄都分開。
 */
export async function POST(req: NextRequest) {
  return handleLineWebhook(req, { tenantId: HOUSE_TENANT, creds: houseCreds() });
}
