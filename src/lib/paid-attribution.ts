import { z } from "zod";

export const PAID_SOURCE_COOKIE = "avalo_paid_source";
const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const label = z.string().regex(/^[a-z0-9_-]{1,80}$/i);
const campaignSchema = z.object({
  source: z.enum(["google", "chatgpt"]),
  medium: z.literal("cpc"),
  name: label.optional(),
  id: label.optional(),
  content: label.optional(),
});
const touchSchema = campaignSchema.extend({ visitedAt: z.number().int().nonnegative() });
const attributionSchema = z.object({ first: touchSchema, last: touchSchema });
const inquirySourceSchema = z.object({
  attribution: attributionSchema.optional(),
  campaign: campaignSchema.optional(),
});

type Campaign = z.infer<typeof campaignSchema>;
type PaidAttribution = z.infer<typeof attributionSchema>;

function parseJson(value: string | undefined | null): unknown {
  try {
    return value ? JSON.parse(value) : undefined;
  } catch {
    return undefined;
  }
}

export function readPaidAttribution(value: string | undefined, now = Date.now()): PaidAttribution | undefined {
  const parsed = attributionSchema.safeParse(parseJson(value));
  if (!parsed.success) return;
  const { first, last } = parsed.data;
  if (last.visitedAt < first.visitedAt || last.visitedAt > now) return;
  if (now - first.visitedAt >= ATTRIBUTION_WINDOW_MS) return;
  return parsed.data;
}

export function capturePaidAttribution(
  params: URLSearchParams,
  previous: string | undefined,
  now = Date.now(),
) {
  const source = params.get("utm_source")?.toLowerCase();
  const medium = params.get("utm_medium")?.toLowerCase();
  const hasGoogleClick = ["gclid", "gbraid", "wbraid"].some((key) =>
    /^[a-z0-9_-]{1,256}$/i.test(params.get(key) ?? ""),
  );
  const channel = hasGoogleClick ? "google" : source;
  if ((channel !== "google" && channel !== "chatgpt") || (!hasGoogleClick && medium !== "cpc")) return;

  // 只存放符合格式的行銷標記。Google 點擊 ID 只用來辨認管道。
  const matchedUtm = source === channel && medium === "cpc";
  const optionalLabel = (key: string) => {
    if (!matchedUtm) return;
    const parsed = label.safeParse(params.get(key));
    return parsed.success ? parsed.data : undefined;
  };
  const last = {
    source: channel,
    medium: "cpc",
    name: optionalLabel("utm_campaign"),
    id: optionalLabel("utm_id"),
    content: optionalLabel("utm_content"),
    visitedAt: now,
  } satisfies z.infer<typeof touchSchema>;
  const first = readPaidAttribution(previous, now)?.first ?? last;
  return { value: JSON.stringify({ first, last }), expires: new Date(first.visitedAt + ATTRIBUTION_WINDOW_MS) };
}

export function readInquirySource(payload: string | null): { first?: Campaign; last?: Campaign } {
  const parsed = inquirySourceSchema.safeParse(parseJson(payload));
  if (!parsed.success) return {};
  return parsed.data.attribution ?? { last: parsed.data.campaign };
}

export function formatPaidSource(campaign: Campaign | undefined) {
  if (!campaign) return "—";
  const source = campaign.source === "google" ? "Google Ads" : "ChatGPT Ads";
  return [source, campaign.name ?? campaign.id, campaign.content].filter(Boolean).join(" / ");
}
