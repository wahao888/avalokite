import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimited } from "@/lib/rate-limit";

const EVENTS = new Set([
  "generate_lead",
  "add_to_cart",
  "begin_checkout",
  "purchase",
  "click_line",
  "open_chat",
  "quiz_complete",
  "tool_geo",
  "tool_cost",
  "tool_savings",
]);

export async function POST(req: NextRequest) {
  if (rateLimited(`event:${clientIp(req)}`, { windowMs: 60_000, max: 60 })) {
    return NextResponse.json({ ok: true });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const event = typeof body === "object" && body && "event" in body ? String((body as { event: unknown }).event) : "";
  if (!EVENTS.has(event)) return NextResponse.json({ ok: false }, { status: 400 });
  console.log(`[event] ${event} ip=${clientIp(req)}`);
  return NextResponse.json({ ok: true });
}
