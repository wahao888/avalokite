import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import proxy from "../src/proxy";
import { POST } from "../src/app/api/contact/route";
import { capturePaidAttribution, PAID_SOURCE_COOKIE, readInquirySource } from "../src/lib/paid-attribution";

const mocks = vi.hoisted(() => {
  const create = vi.fn(async () => ({ id: 91 }));
  return { create, notifyOwner: vi.fn(async () => false) };
});
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => unknown) => fn({ inquiry: { create: mocks.create } }),
  },
}));
vi.mock("@/lib/mail", () => ({ notifyOwner: mocks.notifyOwner }));
vi.mock("@/lib/rate-limit", () => ({ clientIp: () => "test", rateLimited: () => false }));
vi.mock("@/lib/openai-ads-conversions", () => ({
  adsMatchingFields: () => undefined,
  queueAdsConversion: vi.fn(),
}));

function page(path: string, cookie?: string, host = "avalokite.xyz", prefetch = false) {
  return proxy(new NextRequest(`https://${host}${path}`, {
    headers: {
      host,
      ...(cookie ? { cookie: `${PAID_SOURCE_COOKIE}=${encodeURIComponent(cookie)}` } : {}),
      ...(prefetch ? { "next-router-prefetch": "1" } : {}),
    },
  }));
}

describe("Avalo paid lead attribution", () => {
  afterEach(() => vi.clearAllMocks());

  it("keeps the first paid source and persists the latest one after an untagged navigation", async () => {
    const chatgpt = page("/launch?utm_source=chatgpt&utm_medium=cpc&utm_campaign=zero_launch&utm_content=offer_v1");
    const first = chatgpt.cookies.get(PAID_SOURCE_COOKIE);
    expect(first).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax" });
    expect(chatgpt.headers.get("cache-control")).toBe("private, no-store");
    const google = page("/services/website?gclid=test-click&utm_source=google&utm_medium=cpc&utm_id=123", first?.value);
    const cookie = google.cookies.get(PAID_SOURCE_COOKIE)?.value;
    expect(cookie).toBeDefined();
    expect(cookie).not.toContain("test-click");
    expect(page("/contact", cookie).cookies.get(PAID_SOURCE_COOKIE)).toBeUndefined();

    const response = await POST(new NextRequest("https://avalokite.xyz/api/contact", {
      method: "POST",
      headers: { cookie: `${PAID_SOURCE_COOKIE}=${encodeURIComponent(cookie!)}` },
      body: JSON.stringify({ name: "Test inquiry", email: "test@example.test" }),
    }));
    expect(await response.json()).toEqual({ ok: true, recorded: true });
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ payload: expect.any(String) }),
    });
    const [{ data }] = mocks.create.mock.calls[0] as unknown as [{ data: { payload: string } }];
    expect(readInquirySource(data.payload)).toMatchObject({
      first: { source: "chatgpt", name: "zero_launch", content: "offer_v1" },
      last: { source: "google", id: "123" },
    });
    expect(mocks.notifyOwner).toHaveBeenCalledWith(
      expect.stringContaining("#91"), expect.stringContaining("最近付費來源：Google Ads / 123"),
    );
  });

  it("ignores organic visits, other hosts, admin pages, and prefetches", () => {
    expect(page("/?utm_source=chatgpt&utm_medium=referral").cookies.get(PAID_SOURCE_COOKIE)).toBeUndefined();
    expect(page("/?gclid=test", undefined, "wenshan.avalokite.xyz").cookies.get(PAID_SOURCE_COOKIE)).toBeUndefined();
    expect(page("/en/admin?gclid=test").cookies.get(PAID_SOURCE_COOKIE)).toBeUndefined();
    expect(page("/?gclid=test", undefined, "avalokite.xyz", true).cookies.get(PAID_SOURCE_COOKIE)).toBeUndefined();
  });

  it("starts a new window after 30 days and supports older ChatGPT lead records", () => {
    const a = capturePaidAttribution(new URLSearchParams("utm_source=chatgpt&utm_medium=cpc"), undefined, 1000);
    const b = capturePaidAttribution(new URLSearchParams("gbraid=test"), a?.value, 1000 + 30 * 24 * 60 * 60 * 1000);
    expect(readInquirySource(JSON.stringify({ attribution: JSON.parse(b!.value) }))).toMatchObject({
      first: { source: "google" },
      last: { source: "google" },
    });
    expect(readInquirySource('{"campaign":{"source":"chatgpt","medium":"cpc","name":"old","content":"v1"}}'))
      .toEqual({ last: { source: "chatgpt", medium: "cpc", name: "old", content: "v1" } });
  });
});
