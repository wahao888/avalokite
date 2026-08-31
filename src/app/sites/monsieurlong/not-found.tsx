import Link from "next/link";
import { ML } from "./_data/site";

export default function MonsieurLongNotFound() {
  return (
    <div className="ml-wrap ml-notfound">
      <p className="ml-eyebrow">404</p>
      <h1 className="ml-h2">這一支融掉了。</h1>
      <p className="ml-lede">
        頁面不存在，或是那個口味這一季已經結束了。回首頁看看今天櫃上有什麼吧。
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href={`${ML}/`} className="ml-btn ml-btn--primary">
          回首頁
        </Link>
        <Link href={`${ML}/flavors`} className="ml-btn ml-btn--ghost">
          所有口味
        </Link>
      </div>
    </div>
  );
}
