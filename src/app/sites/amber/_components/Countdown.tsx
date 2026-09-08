"use client";

import { useEffect, useState } from "react";
import { countdownLabel, isClosingSoon } from "@/lib/daigou-deadline";
import { IconClock } from "./Icons";

// 倒數計時。
//
// ⚠ 這個元件在伺服器與**首次客戶端 render** 都回傳 null，掛載之後才填值。
// 倒數的字每秒都在變，伺服器算一次、客戶端再算一次必定對不起來，
// 那就是 hydration mismatch。所以絕對時間由伺服器渲染（見 DeadlineBar），
// 相對倒數只在客戶端接手。
//
// ⚠ 時鐘偏移校正：伺服器把自己的「現在」一起送過來，客戶端算出差值之後
// 用校正過的時間計時。手機時鐘不準的客人才不會在還開放的商品上看到「已截止」。
//
// 客戶端只會**樂觀地顯示已截止**，永遠不會反過來把一個伺服器說關閉的商品
// 顯示成開放——能不能下單一律由伺服器判斷。

export function Countdown({
  deadlineISO,
  serverNowISO,
  className,
}: {
  deadlineISO: string;
  serverNowISO: string;
  className?: string;
}) {
  const [label, setLabel] = useState<string | null>(null);
  const [soon, setSoon] = useState(false);

  useEffect(() => {
    const deadline = new Date(deadlineISO);
    const skew = new Date(serverNowISO).getTime() - Date.now();

    const tick = () => {
      const now = new Date(Date.now() + skew);
      setLabel(countdownLabel(deadline, now));
      setSoon(isClosingSoon(deadline, now));
    };
    tick();

    // 一分鐘更新一次就夠了——顯示的粒度本來就是「剩 N 分鐘」。
    // 每秒重繪只會在她口袋裡空轉耗電。
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [deadlineISO, serverNowISO]);

  // 掛載前不佔位也不閃動；外層的絕對時間已經先把資訊給出去了。
  if (label === null) return null;

  // className 傳空字串的呼叫端（檔期橫幅）只要文字，不要晶片外框與圖示
  if (className !== undefined) return <span className={className}>{label}</span>;

  return (
    <span className={`am-tag ${soon ? "am-tag--soon" : ""}`}>
      <IconClock size={13} stroke={2} />
      {label}
    </span>
  );
}
