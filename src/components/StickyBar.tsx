"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LINE_URL } from "@/lib/site";
import { promoOpen } from "@/lib/promo-window";
import { track } from "@/lib/track";

export default function StickyBar() {
  const zh = useLocale() !== "en";
  const pricing = promoOpen() ? "/launch" : "/pricing";
  return (
    <nav className="sticky-bar" aria-label={zh ? "快速行動" : "Quick actions"}>
      <a
        href={LINE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("click_line", { place: "sticky" })}
      >
        {zh ? "LINE 諮詢" : "LINE"}
      </a>
      <Link href={pricing}>{zh ? "看方案" : "Plans"}</Link>
      <button
        type="button"
        onClick={() => {
          track("open_chat", { place: "sticky" });
          window.dispatchEvent(new Event("avalo:open-chat"));
        }}
      >
        {zh ? "線上客服" : "Chat"}
      </button>
    </nav>
  );
}
