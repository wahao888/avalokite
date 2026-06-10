import { useTranslations } from "next-intl";

export default function Ticker() {
  const t = useTranslations();
  const items = t.raw("ticker") as string[];
  const doubled = [...items, ...items]; // 無縫循環需要兩份

  return (
    <div className="ticker">
      <div className="ticker-inner">
        {doubled.map((item, i) => (
          <span key={i}>
            {item} <span className="dot">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
