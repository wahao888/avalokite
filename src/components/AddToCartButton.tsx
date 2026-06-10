"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCart } from "@/lib/cart";

export default function AddToCartButton({ sku }: { sku: string }) {
  const t = useTranslations("pricing");
  const { add, has } = useCart();
  const router = useRouter();

  if (has(sku)) {
    return (
      <button className="btn-ghost" onClick={() => router.push("/cart")}>
        {t("inCart")}
      </button>
    );
  }
  return (
    <button className="btn-primary" onClick={() => add(sku)}>
      {t("addToCart")}
    </button>
  );
}
