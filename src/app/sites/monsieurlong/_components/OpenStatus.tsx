"use client";

import { useEffect, useState } from "react";
import { HOURS, SITE, WEEKDAY_ZH } from "../_data/site";

/* 台北時間的「今天星期幾、現在幾點」。
   伺服器與訪客可能在不同時區，所以一律以 Asia/Taipei 重新計算，
   而且只在掛載後算——伺服器算一次、客戶端算一次會 hydration 不一致。 */
function taipeiNow(): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const hour = Number(get("hour")) % 24;
  return { day: day < 0 ? 0 : day, minutes: hour * 60 + Number(get("minute")) };
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export type OpenState = { open: boolean; label: string } | null;

export function useOpenState(): OpenState {
  const [state, setState] = useState<OpenState>(null);

  useEffect(() => {
    const tick = () => {
      const { day, minutes } = taipeiNow();
      const today = HOURS[day];
      if (!today) {
        // 找出下一個有營業的日子
        let n = 1;
        while (n < 8 && !HOURS[(day + n) % 7]) n++;
        setState({ open: false, label: `今日公休・週${WEEKDAY_ZH[(day + n) % 7]}再開` });
        return;
      }
      const o = toMin(today.open);
      const c = toMin(today.close);
      if (minutes < o) setState({ open: false, label: `今日 ${today.open} 開賣` });
      else if (minutes >= c) setState({ open: false, label: "今日已打烊" });
      else setState({ open: true, label: `營業中・${today.close} 打烊` });
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return state;
}

export default function OpenStatus({ className }: { className?: string }) {
  const state = useOpenState();

  return (
    <span
      className={`ml-status ${className ?? ""}`}
      data-open={state?.open ?? false}
      // 還沒算出來之前先給營業時間本身，SSR 與首次繪製都不會是空的
      suppressHydrationWarning
    >
      <i />
      {state ? state.label : SITE.hoursNote}
    </span>
  );
}

/** 一週營業時間表，今天那列會亮起來 */
export function HoursTable() {
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => setToday(taipeiNow().day), []);

  return (
    <div className="ml-hours">
      {HOURS.map((h, i) => (
        <div className="ml-hours-row" key={i} data-today={today === i} data-closed={!h}>
          <span className="ml-hours-day">
            週{WEEKDAY_ZH[i]}
            {today === i && <b style={{ color: "var(--ml-yellow-deep)" }}>今天</b>}
          </span>
          <span>{h ? `${h.open} – ${h.close}` : "公休"}</span>
        </div>
      ))}
    </div>
  );
}
