import type { Prisma } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { adsMatchingFields, queueAdsConversion, runAdsConversionQueue } from "../src/lib/openai-ads-conversions";

const { adsConversion } = vi.hoisted(() => ({
  adsConversion: { findMany: vi.fn(), updateMany: vi.fn() },
}));
vi.mock("../src/lib/prisma", () => ({ prisma: { adsConversion, order: { updateMany: vi.fn() } } }));

const request = new NextRequest("https://avalokite.example/api/contact", {
  headers: { cookie: "__oppref=example-click; __obref=example-browser" },
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("OpenAI Ads conversions", () => {
  it("reads matching cookies only with consent", () => {
    expect(adsMatchingFields(request, false)).toBeUndefined();
    expect(adsMatchingFields(request, true)).toMatchObject({
      adsOppref: "example-click", adsObref: "example-browser",
    });
  });

  it("queues a lead with normalized hashed email and matching references", async () => {
    const upsert = vi.fn();
    const tx = { adsConversion: { upsert } } as unknown as Prisma.TransactionClient;
    const occurredAt = new Date("2026-11-13T12:34:56Z");
    await queueAdsConversion(tx, {
      id: "avalo-lead-42", type: "lead_created", email: " User@Example.com ",
      locale: "en", path: "/contact", occurredAt, matching: adsMatchingFields(request, true)!,
    });

    const { where, create } = upsert.mock.calls[0][0];
    expect(where).toEqual({ id: "avalo-lead-42" });
    expect(create.payload).not.toMatch(/user@example\.com/i);
    expect(JSON.parse(create.payload)).toEqual({
      id: "avalo-lead-42", type: "lead_created", timestamp_ms: occurredAt.getTime(),
      action_source: "web", source_url: expect.stringMatching(/\/en\/contact$/), oppref: "example-click",
      user: {
        obref: "example-browser",
        emails_sha256: ["b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514"],
      },
      data: { type: "customer_action" },
    });
  });

  it("keeps the same event ID across an outage and clears the payload after delivery", async () => {
    vi.stubEnv("NEXT_PUBLIC_OPENAI_ADS_PIXEL_ID", "test-pixel");
    vi.stubEnv("OPENAI_ADS_CONVERSIONS_API_KEY", "test-key");
    const body = '{"id":"avalo-lead-42","type":"lead_created"}';
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response("{}"));
    vi.stubGlobal("fetch", fetch);
    adsConversion.updateMany.mockResolvedValue({ count: 1 });
    adsConversion.findMany
      .mockResolvedValueOnce([{ id: "avalo-lead-42", payload: body, attempts: 0 }])
      .mockResolvedValueOnce([{ id: "avalo-lead-42", payload: body, attempts: 1 }]);

    expect(await runAdsConversionQueue()).toMatchObject({ sent: 0, retried: 1 });
    expect(adsConversion.updateMany).toHaveBeenLastCalledWith({
      where: { id: "avalo-lead-42", attempts: 1 },
      data: { lastError: "HTTP 503", nextAttemptAt: expect.any(Date) },
    });
    expect(await runAdsConversionQueue()).toMatchObject({ sent: 1, retried: 0 });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(String(fetch.mock.calls[1][0])).toBe("https://bzr.openai.com/v1/events?pid=test-pixel");
    expect(fetch.mock.calls[1][1]).toMatchObject({
      headers: { Authorization: "Bearer test-key" }, body: `{"events":[${body}]}`,
    });
    expect(fetch.mock.calls[0][1]?.body).toBe(fetch.mock.calls[1][1]?.body);
    expect(adsConversion.updateMany).toHaveBeenLastCalledWith({
      where: { id: "avalo-lead-42", attempts: 2 },
      data: { lastError: null, sentAt: expect.any(Date), payload: "" },
    });
  });
});
