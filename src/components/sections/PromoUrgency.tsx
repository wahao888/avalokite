"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  PROMO_WINDOW,
  remainingFrom,
  seatsLeft,
  type Remaining,
} from "@/lib/promo-window";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 名額進度條＋倒數。倒數只在瀏覽器算：伺服器算會被 Next 的靜態產出凍住，
 * 也會和使用者的時鐘對不起來，因此首次繪製先留佔位（`--`），掛載後才填值。
 */
export default function PromoUrgency() {
  const t = useTranslations("promo");
  const [left, setLeft] = useState<Remaining | null>(null);

  useEffect(() => {
    const tick = () => setLeft(remainingFrom());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const { seatsTaken, seatsTotal } = PROMO_WINDOW;
  const pct = Math.min(100, Math.round((seatsTaken / seatsTotal) * 100));

  const cells: Array<[string, string]> = [
    [left ? String(left.days) : "--", t("cd.d")],
    [left ? pad(left.hours) : "--", t("cd.h")],
    [left ? pad(left.minutes) : "--", t("cd.m")],
    [left ? pad(left.seconds) : "--", t("cd.s")],
  ];

  return (
    <div className="promo-urgency">
      <div className="promo-seats">
        <div className="promo-urgency-label">{t("seatsLabel")}</div>
        <div className="promo-seats-count">
          <b>{seatsTaken}</b>
          <span className="promo-seats-of"> / {seatsTotal}</span>
          <span className="promo-seats-left">{t("seatsLeft", { n: seatsLeft() })}</span>
        </div>
        <div
          className="promo-seats-bar"
          role="progressbar"
          aria-valuenow={seatsTaken}
          aria-valuemin={0}
          aria-valuemax={seatsTotal}
          aria-label={t("seatsLabel")}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="promo-countdown">
        <div className="promo-urgency-label">{t("countdownLabel")}</div>
        <div className="promo-clock" aria-live="off">
          {cells.map(([value, unit], i) => (
            <div className="promo-clock-cell" key={unit}>
              <b>{value}</b>
              <span>{unit}</span>
              {i < cells.length - 1 && <i className="promo-clock-sep" aria-hidden="true" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
