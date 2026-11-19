import { afterEach, expect, it, vi } from "vitest";
import { track } from "../src/lib/track";

afterEach(() => vi.unstubAllGlobals());

it("sends a Google Ads conversion only for a recorded lead event", () => {
  const gtag = vi.fn();
  vi.stubGlobal("window", { gtag });
  vi.stubGlobal("navigator", { sendBeacon: vi.fn() });

  track("click_line");
  track("generate_lead", { via: "form" });

  expect(gtag.mock.calls).toEqual([
    ["event", "click_line", {}],
    ["event", "generate_lead", { via: "form" }],
    ["event", "conversion", {
      send_to: "AW-18582170733/Nj7CCK6i87odEO3Y1ZxF",
      value: 1,
      currency: "TWD",
    }],
  ]);
});
