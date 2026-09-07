import type { Metadata } from "next";
import { CartPageView } from "../_components/CartPageView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "購物車" };

export default function CartPage() {
  return (
    <div className="am-wrap">
      <h1 className="am-h1">購物車</h1>
      <p className="am-sub">連線期間可以一直加購，同一檔的訂單最後會併成一張出貨單。</p>
      <CartPageView />
    </div>
  );
}
