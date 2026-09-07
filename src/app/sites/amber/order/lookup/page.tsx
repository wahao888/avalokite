import type { Metadata } from "next";
import { OrderLookup } from "../../_components/OrderLookup";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "查訂單" };

export default function LookupPage() {
  return (
    <div className="am-wrap">
      <h1 className="am-h1">查訂單</h1>
      <p className="am-sub">
        用訂單編號（或結單編號）加上下單時填的手機就查得到。
      </p>
      <OrderLookup />
    </div>
  );
}
