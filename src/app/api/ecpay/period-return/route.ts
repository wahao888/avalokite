import { NextRequest, NextResponse } from "next/server";
import { formToParams, processPeriodCharge } from "@/lib/ecpay-process";

// 定期定額每期扣款結果通知
export async function POST(req: NextRequest) {
  try {
    const params = await formToParams(req);
    await processPeriodCharge(params);
    return new NextResponse("1|OK");
  } catch (err) {
    console.error("[ecpay period-return]", err);
    return new NextResponse("0|Error", { status: 400 });
  }
}
