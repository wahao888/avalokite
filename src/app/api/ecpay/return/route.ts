import { NextRequest, NextResponse } from "next/server";
import { formToParams, processPaymentResult } from "@/lib/ecpay-process";

// 綠界 server-to-server 付款結果通知；必須回 "1|OK" 否則綠界會重送
export async function POST(req: NextRequest) {
  try {
    const params = await formToParams(req);
    await processPaymentResult(params);
    return new NextResponse("1|OK");
  } catch (err) {
    console.error("[ecpay return]", err);
    return new NextResponse("0|Error", { status: 400 });
  }
}
