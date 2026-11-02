import { NextRequest, NextResponse } from "next/server";
import { INDEXNOW_HOST, INDEXNOW_KEY } from "@/lib/indexnow";
import { publicPaths } from "@/lib/site-routes";
import { localeUrl } from "@/lib/seo";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret") ?? "";
  const isLocal = req.headers.get("x-forwarded-for") == null && clientIsLoopback(req);
  if (secret && provided !== secret && !isLocal) {
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

function clientIsLoopback(req: NextRequest) {
  const ip = req.headers.get("x-real-ip") || "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "";
}
