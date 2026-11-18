import { runAdsConversionQueue } from "@/lib/openai-ads-conversions";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return Response.json(await runAdsConversionQueue());
  } catch (error) {
    console.error("[ads conversion cron]", error instanceof Error ? error.name : "unknown error");
    return Response.json({ error: "conversion queue unavailable" }, { status: 500 });
  }
}
