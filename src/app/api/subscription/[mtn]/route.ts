import { NextRequest, NextResponse } from "next/server";
import { careOptionsFor, getProduct } from "@/lib/products";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import {
  cancelSubscription,
  findSubscription,
  replaceSubscription,
} from "@/lib/subscription";

// 客戶自助管理訂閱：換方案 / 重新授權（換卡）/ 終止扣款。
//
// 存取憑證就是 MerchantTradeNo，與 /api/pay/[mtn] 同一套設計：
// 編號含 6 碼亂數不可枚舉，再加限流。這幾個動作都有副作用（打綠界、改 DB），
// 故一律走 POST，避免預抓或爬蟲誤觸。
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mtn: string }> }
) {
  if (rateLimited(`sub:${clientIp(req)}`, { windowMs: WINDOW_MS, max: MAX_PER_WINDOW })) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }
  const { mtn } = await params;
  if (!/^[A-Z0-9]{4,20}$/.test(mtn)) {
    return NextResponse.json({ error: "bad trade no" }, { status: 400 });
  }

  const sub = await findSubscription(mtn);
  if (!sub) return NextResponse.json({ error: "not found" }, { status: 404 });

  const form = await req.formData();
  const action = String(form.get("action") ?? "");
  const locale = sub.order.locale === "en" ? "en" : "zh-TW";
  const back = (q: string) =>
    NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/${locale}/subscription/${mtn}?${q}`,
      303
    );

  if (action === "cancel") {
    const r = await cancelSubscription(sub, "customer");
    return back(r.ok ? "done=cancel" : "err=ecpay");
  }

  if (action === "change" || action === "reauth") {
    // 換方案只能換成這張訂單的建置方案允許的維護（促銷建置不得跳到正式月費方案）
    const orderSkus = (JSON.parse(sub.order.items) as { sku: string }[]).map((i) => i.sku);
    const allowed = careOptionsFor(orderSkus).map((p) => p.sku);
    const newSku = action === "reauth" ? sub.sku : String(form.get("sku") ?? "");

    if (action === "change") {
      // 訂單沒有建置品項（單購維護）時 careOptionsFor 為空，改以「同型月費方案」為準
      const ok = allowed.length > 0 ? allowed.includes(newSku) : getProduct(newSku)?.type === "monthly";
      if (!ok || newSku === sub.sku) return back("err=badsku");
    }

    const r = await replaceSubscription(sub, newSku, action);
    if (!r.ok) return back(`err=${r.error}`);
    // 直接把客戶送到綠界完成新授權
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/pay/${r.mtn}`,
      303
    );
  }

  return back("err=badaction");
}
