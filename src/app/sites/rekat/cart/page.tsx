import type { Metadata } from "next";
import CartPage from "../_components/CartPage";

export const metadata: Metadata = {
  title: "購物車",
  // 購物車與結帳沒有可索引的內容，且每個人看到的都不一樣
  robots: { index: false, follow: true },
};

export default function Cart() {
  return (
    <div className="rk-wrap">
      <section style={{ paddingBlock: "clamp(36px, 5vw, 60px) 4px" }}>
        <span className="rk-eyebrow">Cart</span>
        <h1 className="rk-h1" style={{ marginTop: 12, fontSize: "clamp(28px, 4vw, 44px)" }}>
          購物車
        </h1>
      </section>
      <hr className="rk-rule" />
      <CartPage />
    </div>
  );
}
