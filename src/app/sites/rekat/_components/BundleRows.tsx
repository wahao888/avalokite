import { twd, type BundleSaving, type PricedLine } from "../_data/shop";
import type { Bean } from "../_data/beans";

/**
 * 小計區塊裡的三包優惠折抵列。
 *
 * 折抵刻意獨立成一列，不攤回各品項的單價——這樣客人拿網頁跟紙本豆單對，
 * 「數量 × 單價」每一格都對得起來，而優惠是另外一條看得見的減項。
 * 購物車抽屜、購物車頁、結帳頁三個地方共用同一份，不會出現寫法不一致。
 */
export default function BundleRows({ bundles }: { bundles: BundleSaving[] }) {
  if (bundles.length === 0) return null;
  return (
    <>
      {bundles.map((b) => (
        <div className="off" key={b.slug}>
          <span>
            {b.label} {twd(b.bundlePrice)}
            {b.sets > 1 && ` × ${b.sets} 組`}
            <br />
            <span style={{ fontSize: 11.5, opacity: 0.75 }}>{b.name}</span>
          </span>
          <b>−{twd(b.saved)}</b>
        </div>
      ))}
    </>
  );
}

/**
 * 購物車每一行下面那句優惠提示。
 *
 * 客戶要的是「該品項幾包有優惠、優惠價多少」——所以永遠先把規則講完整
 * （三包 NT$4,800），再視情況補上「還差幾包」或「已套用幾組」。
 * 只講「再加 1 包」而不講規則的話，看不出來到底划算在哪。
 */
export function BundleHint({ line, bean }: { line: PricedLine; bean: Bean }) {
  const b = bean.bundle;
  if (!b) return null;
  const sets = Math.floor(line.qty / b.qty);
  // 「三包」這個標籤本身已經講了數量，不要再補一次「3 包」
  const rule = `${b.label} ${twd(b.price)}`;
  const savePerSet = bean.price * b.qty - b.price;

  return (
    <span className="rk-line__free">
      {rule}
      {sets > 0
        ? `・已套用 ${sets} 組，省 ${twd(sets * savePerSet)}`
        : `・再加 ${line.toNextBundle} 包省 ${twd(savePerSet)}`}
    </span>
  );
}
