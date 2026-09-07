import type { Metadata } from "next";
import { CheckoutForm } from "../_components/CheckoutForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "結帳" };

export default function CheckoutPage() {
  return (
    <div className="am-wrap">
      <CheckoutForm />
    </div>
  );
}
