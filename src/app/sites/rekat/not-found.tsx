import Link from "next/link";
import { RK } from "./_data/site";

export default function RekatNotFound() {
  return (
    <div className="rk-wrap rk-notfound">
      <span className="rk-eyebrow">404</span>
      <h1 className="rk-h2">這一支下架了。</h1>
      <p className="rk-lede">
        頁面不存在，或是那支豆子這一批已經賣完。豆單每季會換，回去看看現在櫃上有什麼。
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href={`${RK}/beans`} className="rk-btn rk-btn--solid">
          本期豆單
        </Link>
        <Link href={`${RK}/`} className="rk-btn rk-btn--ghost">
          回首頁
        </Link>
      </div>
    </div>
  );
}
