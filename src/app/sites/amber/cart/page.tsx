import type { Metadata } from "next";
import { CartPageView } from "../_components/CartPageView";
import { IconBag } from "../_components/Icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "購物車" };

export default function CartPage() {
  return (
    <div className="am-wrap">
      <header className="am-pagehead">
        <p className="am-eyebrow">
          <IconBag size={14} stroke={2} />
          購物車
        </p>
        <h1>購物車</h1>
        <p>連線期間可以一直加購，同一檔的訂單最後會併成一張出貨單。</p>
      </header>
      <CartPageView />
    </div>
  );
}
