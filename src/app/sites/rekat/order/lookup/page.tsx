import type { Metadata } from "next";
import OrderLookup from "../../_components/OrderLookup";

export const metadata: Metadata = {
  title: "訂單查詢",
  description: "輸入訂單編號與下單電話，查詢訂單進度、回報匯款帳號末五碼。",
  robots: { index: false, follow: true },
};

export default function OrderLookupPage() {
  return (
    <div className="rk-wrap">
      <section style={{ paddingBlock: "clamp(36px, 5vw, 60px) 4px" }}>
        <span className="rk-eyebrow">Order Status</span>
        <h1 className="rk-h1" style={{ marginTop: 12, fontSize: "clamp(28px, 4vw, 44px)" }}>
          訂單查詢
        </h1>
        <p className="rk-lede" style={{ marginTop: 16 }}>
          需要訂單編號與下單時填的手機號碼。匯款完成後也在這裡回報末五碼。
        </p>
      </section>
      <hr className="rk-rule" />
      <div style={{ paddingTop: 8 }}>
        <OrderLookup />
      </div>
    </div>
  );
}
