"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  compactClock,
  isExpired,
  remainingFrom,
  seatsLeft,
  type Remaining,
} from "@/lib/promo-window";
import { PROMO_PLANS } from "@/lib/products";

/**
 * navbar 下方的限時橫幅。跟著 nav 一起浮動（同在 .topbar 裡），
 * 點進獨立的限時方案頁，不再只錨回首頁區塊。
 */
export default function PromoBar() {
  const t = useTranslations("promo");
  const [left, setLeft] = useState<Remaining | null>(null);
  // 過期判斷跟倒數一樣只在瀏覽器算，伺服器算會被靜態產出凍住、也會跟使用者時鐘對不上
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const tick = () => {
      setLeft(remainingFrom());
      setEnded(isExpired());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // 檔期一過或名額售罄就不再宣傳：留著過期的倒數、或喊「僅剩 0 席」比沒有倒數更傷信任
  if (PROMO_PLANS.length === 0 || seatsLeft() === 0 || ended) return null;

  return (
    <Link className="promo-bar" href="/launch">
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
