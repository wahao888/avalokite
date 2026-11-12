/** 第一方轉換事件。不依賴 GA；有 GA ID 時同時送 gtag。 */
export type TrackEvent =
  | "generate_lead"
  | "add_to_cart"
  | "begin_checkout"
  | "purchase"
  | "click_line"
  | "open_chat"
  | "quiz_complete"
  | "tool_geo"
  | "tool_cost"
  | "tool_savings";

export function track(event: TrackEvent, extra: Record<string, string | number | undefined> = {}) {
  const payload = { event, ...extra, path: typeof location !== "undefined" ? location.pathname : "" };
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/event", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/event", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
    }
  } catch {
    /* 追蹤失敗不能擋下單 */
  }
  if (event === "begin_checkout") {
    measureOpenAIAds("checkout_started", { type: "contents" });
  } else if (event === "click_line") {
    measureOpenAIAds("custom", { type: "custom" }, { custom_event_name: "clickline" });
  }
  const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
  gtag?.("event", event, extra);
}

type OpenAIAdsEvent =
  | [event: "items_added" | "checkout_started", data: { type: "contents" }]
  | [event: "page_viewed", data: { type: "contents"; contents: { id: string; content_type: "page" }[] }]
  | [event: "custom", data: { type: "custom" }, options: { custom_event_name: "clickline" }];

export function measureItemsAdded() {
  measureOpenAIAds("items_added", { type: "contents" });
}

export function measureOpenAIAds(...event: OpenAIAdsEvent) {
  try {
    const { oaiq } = window as Window & {
      oaiq?: (command: "measure", ...event: OpenAIAdsEvent) => void;
    };
    oaiq?.("measure", ...event);
  } catch {
    /* 廣告追蹤失敗不影響網站操作 */
  }
}
