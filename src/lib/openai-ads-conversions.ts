import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { localePath } from "@/i18n/routing";
import { SITE } from "./site";

function browserReference(request: NextRequest, name: string) {
  const value = request.cookies.get(name)?.value;
  return value && value.trim() && value.length <= 2048 ? value : undefined;
}

export function prepareLeadConversion(
  request: NextRequest,
  inquiry: { id: number; email: string; createdAt: Date },
  { consent, locale, placement }: { consent: boolean; locale: string; placement: "home" | "contact" },
) {
  const key = process.env.OPENAI_ADS_CONVERSIONS_API_KEY?.trim();
  const pixelId = process.env.NEXT_PUBLIC_OPENAI_ADS_PIXEL_ID?.trim();
  if (!consent || !key || !pixelId) return;

  const url = new URL("https://bzr.openai.com/v1/events");
  url.searchParams.set("pid", pixelId);
  const page = localePath(locale === "en" ? "en" : "zh-TW", placement === "home" ? "/" : "/contact");
  const email = inquiry.email.trim().toLowerCase();
  const obref = browserReference(request, "__obref");
  const user = {
    obref,
    emails_sha256: email && email !== "-"
      ? [createHash("sha256").update(email, "utf8").digest("hex")]
      : undefined,
  };
  const body = JSON.stringify({
    events: [{
      id: `avalo-lead-${inquiry.id}`,
      type: "lead_created",
      timestamp_ms: inquiry.createdAt.getTime(),
      action_source: "web",
      source_url: new URL(page, SITE.url).href,
      oppref: browserReference(request, "__oppref"),
      user: user.obref || user.emails_sha256 ? user : undefined,
      data: { type: "customer_action" },
    }],
  });

  return async function sendLead() {
    for (const delay of [0, 1000, 3000]) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body,
          signal: AbortSignal.timeout(3000),
          redirect: "error",
        });
        if (response.ok) return;
        if (response.status !== 429 && response.status < 500) {
          console.warn("[openai ads] lead conversion rejected", response.status);
          return;
        }
      } catch {
        // 網路錯誤使用同一事件 ID 重試。
      }
    }
    console.warn("[openai ads] lead conversion delivery failed after retries");
  };
}
