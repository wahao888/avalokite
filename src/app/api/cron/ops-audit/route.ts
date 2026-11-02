import { NextRequest, NextResponse } from "next/server";
import { auditTsv, runOpsAudit } from "@/lib/ops-audit";

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

  const checks = await runOpsAudit();

  if (req.nextUrl.searchParams.get("format") === "tsv") {
    return new NextResponse(auditTsv(checks) + "\n", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.json({
    worst: checks.reduce((m, c) => Math.max(m, c.level), 0),
    checks,
  });
}

export const GET = handle;
export const POST = handle;
