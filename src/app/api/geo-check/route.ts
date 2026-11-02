import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { fetchPublic, hostBlocked } from "@/lib/safe-fetch";

const AI_BOTS = ["GPTBot", "Google-Extended", "PerplexityBot", "ClaudeBot", "CCBot", "OAI-SearchBot"];

const schema = z.object({
  url: z.string().trim().min(8).max(500),
});

export async function POST(req: NextRequest) {
  if (rateLimited(`geo:${clientIp(req)}`, { windowMs: 10 * 60_000, max: 10 })) {
    return NextResponse.json({ ok: false, error: "too many requests" }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid url" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(parsed.data.url.includes("://") ? parsed.data.url : `https://${parsed.data.url}`);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid url" }, { status: 400 });
  }
  if (hostBlocked(target.hostname)) {
    return NextResponse.json({ ok: false, error: "host not allowed" }, { status: 400 });
  }

  try {
    const origin = `${target.protocol}//${target.host}`;
    const page = await fetchPublic(origin + (target.pathname || "/"));
    let robotsText = "";
    try {
      robotsText = (await fetchPublic(`${origin}/robots.txt`)).text;
    } catch {
      robotsText = "";
    }
    let llms = false;
    try {
      const r = await fetchPublic(`${origin}/llms.txt`);
      llms = r.status < 400 && r.text.trim().length > 0;
    } catch {
      llms = false;
    }
    const blocked = AI_BOTS.filter((bot) => {
      const re = new RegExp(`user-agent:\\s*${bot}[\\s\\S]*?disallow:\\s*/`, "i");
      return re.test(robotsText);
    });
    const title = page.text.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
    return NextResponse.json({
      ok: true,
      origin,
      robots: { found: robotsText.length > 0, blocked },
      jsonLd: /application\/ld\+json/i.test(page.text),
      llms,
      title,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "fetch failed" }, { status: 422 });
  }
}
