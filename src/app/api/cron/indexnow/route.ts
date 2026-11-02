import { NextRequest, NextResponse } from "next/server";
import { INDEXNOW_HOST, INDEXNOW_KEY } from "@/lib/indexnow";
import { publicPaths } from "@/lib/site-routes";
import { localeUrl } from "@/lib/seo";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 一律驗 secret。這裡原本還有一條「沒有 x-forwarded-for 就當成本機」的放行，
  // 但 Next 自己會補上那個標頭，條件永遠不成立——看起來有兩條路，實際只有一條。
  // 本機要打就用 deploy/run-cron.sh，它會從 .env 把秘密帶上。
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret") ?? "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const host = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? `https://${INDEXNOW_HOST}`).host;
  const urlList = publicPaths().flatMap(({ path }) => routing.locales.map((l) => localeUrl(l, path)));
  const payload = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `https://${host}/${INDEXNOW_KEY}.txt`,
    urlList: urlList.slice(0, 10000),
  };
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  return NextResponse.json({ ok: res.ok, status: res.status, urls: payload.urlList.length });
}
