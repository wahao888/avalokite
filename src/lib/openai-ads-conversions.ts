import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { localePath } from "@/i18n/routing";
import { prisma } from "./prisma";
import { SITE } from "./site";

const MINUTE = 60_000;
const MAX_AGE = 7 * 24 * 60 * MINUTE;
const MATCHING_AGE = 30 * 24 * 60 * MINUTE;

function browserReference(request: NextRequest, name: string) {
  const value = request.cookies.get(name)?.value;
  return value && value.trim() && value.length <= 2048 ? value : null;
}

export function adsMatchingFields(request: NextRequest, consent: boolean) {
  if (!consent) return;
  return {
    adsMeasurementAt: new Date(),
    adsOppref: browserReference(request, "__oppref"),
    adsObref: browserReference(request, "__obref"),
  };
}

type Matching = NonNullable<ReturnType<typeof adsMatchingFields>>;

export async function queueAdsConversion(
  tx: Prisma.TransactionClient,
  event: {
    id: string;
    email: string;
    locale: string;
    path: "/" | "/contact" | "/checkout";
    occurredAt: Date;
    matching: Pick<Matching, "adsOppref" | "adsObref">;
  } & ({ type: "lead_created" } | { type: "order_created"; amountTwd: number }),
) {
  const email = event.email.trim().toLowerCase();
  const emailHash = email && email !== "-" ? createHash("sha256").update(email).digest("hex") : undefined;
  const { adsOppref, adsObref } = event.matching;
  const path = localePath(event.locale === "en" ? "en" : "zh-TW", event.path);
  const payload = JSON.stringify({
    id: event.id,
    type: event.type,
    timestamp_ms: event.occurredAt.getTime(),
    action_source: "web",
    source_url: new URL(path, SITE.url).href,
    oppref: adsOppref ?? undefined,
    user: adsObref || emailHash ? {
      obref: adsObref ?? undefined,
      emails_sha256: emailHash ? [emailHash] : undefined,
    } : undefined,
    data: event.type === "lead_created"
      ? { type: "customer_action" }
      // 綠界用整元，Conversions API 用 ISO 4217 最小貨幣單位。
      : { type: "contents", amount: event.amountTwd * 100, currency: "TWD" },
  });

  await tx.adsConversion.upsert({
    where: { id: event.id },
    update: {},
    create: { id: event.id, payload, createdAt: event.occurredAt },
  });
}

export async function runAdsConversionQueue() {
  const now = new Date();
  await prisma.order.updateMany({
    where: {
      adsMeasurementAt: { lte: new Date(now.getTime() - MATCHING_AGE) },
      OR: [{ adsOppref: { not: null } }, { adsObref: { not: null } }],
    },
    data: { adsOppref: null, adsObref: null },
  });
  // 成功時立即清除配對資料，逾期無法送出的資料也清除。
  await prisma.adsConversion.updateMany({
    where: { sentAt: null, createdAt: { lte: new Date(now.getTime() - MAX_AGE) }, payload: { not: "" } },
    data: { payload: "", lastError: "expired" },
  });
  const key = process.env.OPENAI_ADS_CONVERSIONS_API_KEY?.trim();
  const pixelId = process.env.NEXT_PUBLIC_OPENAI_ADS_PIXEL_ID?.trim();
  if (!key || !pixelId) return { enabled: false };

  const url = new URL("https://bzr.openai.com/v1/events");
  url.searchParams.set("pid", pixelId);
  const where = { sentAt: null, nextAttemptAt: { lte: now }, payload: { not: "" } };
  const jobs = await prisma.adsConversion.findMany({ where, orderBy: { nextAttemptAt: "asc" }, take: 10 });
  let sent = 0;
  let retried = 0;
  for (const job of jobs) {
    const attempts = job.attempts + 1;
    const claimed = await prisma.adsConversion.updateMany({
      where: { ...where, id: job.id, attempts: job.attempts },
      data: { attempts, nextAttemptAt: new Date(Date.now() + 2 * MINUTE) },
    });
    if (!claimed.count) continue;

    let error: string | null = null;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: `{"events":[${job.payload}]}`,
        signal: AbortSignal.timeout(3000),
        redirect: "error",
      });
      if (!response.ok) error = `HTTP ${response.status}`;
      await response.body?.cancel();
    } catch {
      error = "request failed";
    }

    await prisma.adsConversion.updateMany({
      where: { id: job.id, attempts },
      data: error
        ? { lastError: error, nextAttemptAt: new Date(Date.now() + Math.min(2 ** attempts, 360) * MINUTE) }
        : { sentAt: new Date(), lastError: null, payload: "" },
    });
    if (error) retried++;
    else sent++;
  }
  return { enabled: true, sent, retried };
}
