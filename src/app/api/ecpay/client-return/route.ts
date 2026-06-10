import { NextRequest, NextResponse } from "next/server";
import { formToParams, processPaymentResult } from "@/lib/ecpay-process";

// OrderResultURL：信用卡付款完成後，綠界將使用者瀏覽器 POST 回來
// 驗章入帳後 303 轉到結果頁（本機測試也能走通，不依賴外網 webhook）
export async function POST(req: NextRequest) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const params = await formToParams(req);
    const orderId = await processPaymentResult(params);
    return NextResponse.redirect(`${site}/order/result?id=${orderId}`, 303);
  } catch (err) {
    console.error("[ecpay client-return]", err);
    return NextResponse.redirect(`${site}/order/result?error=1`, 303);
  }
}
