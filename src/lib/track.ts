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
  const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
  gtag?.("event", event, extra);
}
