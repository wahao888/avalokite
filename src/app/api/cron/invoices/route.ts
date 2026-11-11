import { runInvoiceQueue } from "@/lib/invoices";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return Response.json(await runInvoiceQueue());
  } catch (error) {
    console.error("[invoice cron]", error instanceof Error ? error.name : "unknown error");
    return Response.json({ error: "invoice queue unavailable" }, { status: 500 });
  }
}
