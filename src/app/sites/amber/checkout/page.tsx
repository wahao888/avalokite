import type { Metadata } from "next";
import { CheckoutForm } from "../_components/CheckoutForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "結帳" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ b?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="am-wrap">
      <CheckoutForm batchId={sp.b} />
    </div>
  );
}
