import { NextRequest, NextResponse } from "next/server";
import { auditTsv, bizTsv, runBusinessDigest, runOpsAudit } from "@/lib/ops-audit";

export const dynamic = "force-dynamic";

// 每日營運稽核。只讀不寫，所以 GET 與 POST 都接：
// 每日簡報用 GET 把 TSV 直接串進採集結果，手動查的時候 JSON 比較好讀。
//
//   curl -fsS -H "x-cron-secret: $CRON_SECRET" "http://127.0.0.1:3000/api/cron/ops-audit?format=tsv"
//
// 檢查項目加在 src/lib/ops-audit.ts，這裡不需要改。
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret") ?? "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 生意彙整出錯時只放掉這一塊（簡報會退回 bash 數的筆數），不能連累稽核結果一起 500
  const [checks, business] = await Promise.all([
    runOpsAudit(),
    runBusinessDigest().catch((err) => {
      console.error("[ops-audit] 生意彙整失敗:", err);
      return null;
    }),
  ]);

  if (req.nextUrl.searchParams.get("format") === "tsv") {
    // biz_ok 只在彙整成功時印：昨天零生意時沒有任何 biz 列，排版器要靠它分辨
    // 「真的沒生意」與「這段沒跑到、該退回 bash 自己數的那份」。
    const body = [auditTsv(checks), business ? "biz_ok\t1" : "", business ? bizTsv(business) : ""]
      .filter(Boolean)
      .join("\n");
    return new NextResponse(body + "\n", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.json({
    worst: checks.reduce((m, c) => Math.max(m, c.level), 0),
    business,
    checks,
  });
}

export const GET = handle;
export const POST = handle;
