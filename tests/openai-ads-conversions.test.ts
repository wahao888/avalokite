import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prepareLeadConversion } from "../src/lib/openai-ads-conversions";

const request = new NextRequest("https://avalokite.example/api/contact", {
  headers: { cookie: "__oppref=example-click; __obref=example-browser" },
});
const inquiry = {
  id: 42,
  email: " User@Example.com ",
  createdAt: new Date("2026-11-13T12:34:56Z"),
};
const options = { consent: true, locale: "en", placement: "contact" } as const;

describe("OpenAI Ads lead conversion", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_OPENAI_ADS_PIXEL_ID", "test-pixel");
    vi.stubEnv("OPENAI_ADS_CONVERSIONS_API_KEY", "test-key");
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("requires explicit consent and a server key", () => {
    expect(prepareLeadConversion(request, inquiry, { ...options, consent: false })).toBeUndefined();
    vi.stubEnv("OPENAI_ADS_CONVERSIONS_API_KEY", "");
    expect(prepareLeadConversion(request, inquiry, options)).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the lead with normalized hashed email and both attribution references", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}"));
    await prepareLeadConversion(request, inquiry, options)?.();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://bzr.openai.com/v1/events?pid=test-pixel");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer test-key" });
    expect(String(init?.body)).not.toMatch(/user@example\.com/i);
    expect(JSON.parse(String(init?.body)).events).toEqual([{
      id: "avalo-lead-42",
      type: "lead_created",
      timestamp_ms: inquiry.createdAt.getTime(),
      action_source: "web",
      source_url: expect.stringMatching(/\/en\/contact$/),
      oppref: "example-click",
      user: {
        obref: "example-browser",
        emails_sha256: ["b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514"],
      },
      data: { type: "customer_action" },
    }]);
  });

  it("retries with the same event and omits absent matching data", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    fetchMock.mockResolvedValueOnce(new Response("{}"));
    const send = prepareLeadConversion(
      new NextRequest("https://avalokite.example/api/contact"),
      { ...inquiry, email: "-" },
      options,
    )?.();
    await vi.advanceTimersByTimeAsync(1000);
    await send;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]?.body).toBe(fetchMock.mock.calls[1][1]?.body);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).events[0]).not.toHaveProperty("user");
  });
});
