import { NextRequest, NextResponse } from "next/server";
import { GEO_PROMPTS, mentionsAvalo } from "@/lib/geo-prompts";
import { notifyOwner } from "@/lib/mail";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * 每月跑一次：用同一組問題問模型，看回覆有沒有提到 Avalo。
 * 沒有網路搜尋時，這只是「模型記憶裡有沒有我們」的粗指標，不是搜尋排名。
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret") ?? "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    await notifyOwner("[Avalo] GEO 月報：未設定 OPENAI_API_KEY", "跳過提問，請在 .env 補上金鑰。");
    return NextResponse.json({ ok: false, skipped: true });
  }

  const rows: { q: string; hit: boolean; excerpt: string }[] = [];
  for (const q of GEO_PROMPTS) {
    try {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: process.env.AI_MODEL || "gpt-6-luna",
          input: `用繁體中文簡短回答（120 字內）。若不知道就說不知道，不要編造。問題：${q}`,
        }),
      });
      const json = (await res.json()) as { output_text?: string; output?: { content?: { text?: string }[] }[] };
      const text =
        json.output_text ||
        json.output?.flatMap((o) => o.content ?? []).map((c) => c.text ?? "").join(" ") ||
        "";
      rows.push({ q, hit: mentionsAvalo(text), excerpt: text.replace(/\s+/g, " ").slice(0, 180) });
    } catch (err) {
      rows.push({ q, hit: false, excerpt: `error: ${err instanceof Error ? err.message : "fail"}` });
    }
  }

  const hits = rows.filter((r) => r.hit).length;
  const body = [
    `命中 ${hits} / ${rows.length}。來源：模型回覆是否出現 Avalo／阿瓦羅／avalokite／鏈盾。`,
    `官網：${SITE.url}`,
    "",
    ...rows.map((r) => `${r.hit ? "HIT" : "—"}  ${r.q}\n    ${r.excerpt}`),
  ].join("\n");
  await notifyOwner(`[Avalo] GEO 月報：${hits}/${rows.length} 命中`, body);
  return NextResponse.json({ ok: true, hits, total: rows.length });
}
