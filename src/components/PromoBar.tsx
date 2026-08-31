"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { compactClock, remainingFrom, seatsLeft, type Remaining } from "@/lib/promo-window";
import { PROMO_PLANS } from "@/lib/products";

/**
 * navbar 下方的限時橫幅。跟著 nav 一起浮動（同在 .topbar 裡），
 * 點擊回首頁的 #promo 區塊——在內頁也要能導回去，所以用 next-intl 的 Link 帶 hash。
 */
export default function PromoBar() {
  const t = useTranslations("promo");
  const [left, setLeft] = useState<Remaining | null>(null);

  useEffect(() => {
    const tick = () => setLeft(remainingFrom());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (PROMO_PLANS.length === 0) return null;

  return (
    <Link className="promo-bar" href={{ pathname: "/", hash: "promo" }}>
      <span className="promo-bar-flag">
        <i className="promo-bar-dot" aria-hidden="true" />
        {t("badge")}
      </span>
      <span className="promo-bar-text">{t("barText")}</span>
      <span className="promo-bar-seats">{t("seatsLeft", { n: seatsLeft() })}</span>
      <span className="promo-bar-clock">
        {/* 首次繪製先留佔位，倒數只在瀏覽器算，避免與伺服器時間對不上 */}
        {left ? compactClock(left, t("cd.d")) : "--:--:--"}
      </span>
      <span className="promo-bar-go">{t("barCta")}</span>
    </Link>
  );
}
