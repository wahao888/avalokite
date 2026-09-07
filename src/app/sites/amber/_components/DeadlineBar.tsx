import { formatTaipei } from "@/lib/tw-time";
import { Countdown } from "./Countdown";

// 檔期橫幅。客戶需求第 7 項：「商品頁上方希望直接明顯顯示 收單時間：2026/09/20 23:00」。
//
// 絕對時間由伺服器渲染——它是決定性的字串，前後端一致，可以直接進 HTML，
// 而且沒有 JS 的情況下（LINE 內建瀏覽器偶爾很怪）資訊照樣看得到。
// 相對倒數是掛載後才由 Countdown 補上的加值。

export function DeadlineBar({
  title,
  deadline,
  now,
  closed,
  closedLabel,
}: {
  title: string;
  deadline: Date | null;
  now: Date;
  closed: boolean;
  closedLabel?: string;
}) {
  return (
    <div className={`am-banner${closed ? " am-banner--closed" : ""}`}>
      <span className="am-banner__title">{title}</span>
      {deadline ? (
        <span className="am-banner__time">
          收單時間：<time dateTime={deadline.toISOString()}>{formatTaipei(deadline)}</time>
        </span>
      ) : (
        <span className="am-banner__time">隨時可買</span>
      )}
      <span className="am-banner__left">
        {closed ? (
          (closedLabel ?? "已截止")
        ) : deadline ? (
          <Countdown
            deadlineISO={deadline.toISOString()}
            serverNowISO={now.toISOString()}
            className=""
          />
        ) : null}
      </span>
    </div>
  );
}
