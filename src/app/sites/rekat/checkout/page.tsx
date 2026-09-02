import type { Metadata } from "next";
import CheckoutForm from "../_components/CheckoutForm";

export const metadata: Metadata = {
  title: "結帳",
  robots: { index: false, follow: true },
};

export default function Checkout() {
  return (
    <div className="rk-wrap">
      <section style={{ paddingBlock: "clamp(36px, 5vw, 60px) 4px" }}>
        <span className="rk-eyebrow">Checkout</span>
        <h1 className="rk-h1" style={{ marginTop: 12, fontSize: "clamp(28px, 4vw, 44px)" }}>
          結帳
        </h1>
      </section>
      <hr className="rk-rule" />
      <CheckoutForm />
    </div>
  );
}
