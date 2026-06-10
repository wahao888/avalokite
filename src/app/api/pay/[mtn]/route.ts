import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAioCheckout, buildPeriodCheckout } from "@/lib/ecpay";
import { getProduct } from "@/lib/products";

// 產生自動送出的綠界付款表單頁
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mtn: string }> }
) {
  const { mtn } = await params;
  if (!/^[A-Z0-9]{4,20}$/.test(mtn)) {
    return NextResponse.json({ error: "bad trade no" }, { status: 400 });
  }
  const payment = await prisma.payment.findUnique({
    where: { merchantTradeNo: mtn },
    include: { order: true },
  });
  if (!payment || payment.status === "paid") {
    return NextResponse.json({ error: "payment not found or already paid" }, { status: 404 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const order = payment.order;
  const items = JSON.parse(order.items) as { sku: string; qty: number }[];

  // ItemName：中文品名#分隔（綠界上限 400 字）
  const typeWanted = payment.kind === "onetime" ? "onetime" : "monthly";
  const itemName = items
    .map((i) => ({ p: getProduct(i.sku), qty: i.qty }))
    .filter((x) => x.p && x.p.type === typeWanted)
    .map((x) => `${x.p!.i18n["zh-TW"].name} x ${x.p!.type === "monthly" ? 1 : x.qty}`)
    .join("#")
    .slice(0, 400);

  const base = {
    merchantTradeNo: mtn,
    totalAmount: payment.amount,
    itemName: itemName || "Avalo 服務",
    tradeDesc: "Avalo digital services",
    clientBackUrl: `${site}/order/result?id=${order.id}`,
    orderResultUrl: `${site}/api/ecpay/client-return`,
    returnUrl: `${site}/api/ecpay/return`,
  };

  const payload =
    payment.kind === "period"
      ? buildPeriodCheckout({ ...base, periodReturnUrl: `${site}/api/ecpay/period-return` })
      : buildAioCheckout(base);

  const inputs = Object.entries(payload.fields)
    .map(
      ([k, v]) =>
        `<input type="hidden" name="${k}" value="${v.replace(/"/g, "&quot;")}">`
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="zh-TW"><head><meta charset="utf-8"><title>前往綠界付款…</title>
<style>body{font-family:serif;background:#F0EBE3;color:#2F2B26;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}</style>
</head><body>
<p>正在前往綠界 ECPay 安全付款頁面…</p>
<form id="ecpay" method="post" action="${payload.action}">${inputs}</form>
<script>document.getElementById("ecpay").submit();</script>
</body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
