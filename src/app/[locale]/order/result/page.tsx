import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrderResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "order" });
  const { id, error } = await searchParams;

  const order = id
    ? await prisma.order.findUnique({
        where: { id: id.toUpperCase() },
        include: { payments: true },
      })
    : null;

  let heading = t("failTitle");
  let desc = t("failDesc");
  if (!error && order) {
    if (order.status === "paid") {
      heading = t("successTitle");
      desc = t("successDesc");
    } else if (order.status === "pending" || order.status === "partial") {
      heading = t("pendingTitle");
      desc = t("pendingDesc");
    }
  }

  // 還有未完成的定期定額授權 → 引導完成第二筆
  const nextPayment = order?.payments.find((p) => p.status === "pending");

  return (
    <main className="page-wrap page-wrap-narrow" style={{ textAlign: "center" }}>
      <div className="mono-label" style={{ justifyContent: "center" }}>
        {t("resultTitle")}
      </div>
      <h1 className="section-title">{heading}</h1>
      <p className="section-intro" style={{ marginBottom: "2rem" }}>{desc}</p>

      {order && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "2.5rem" }}>
          {t("orderNo")}：<strong style={{ color: "var(--ink)" }}>{order.id}</strong>
          {"　"}
          <span className={`badge ${order.status}`}>{t(`status.${order.status}`)}</span>
        </p>
      )}

      <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
        {nextPayment && (
          <a href={`/api/pay/${nextPayment.merchantTradeNo}`} className="btn-primary">
            {locale === "en"
              ? `Complete ${nextPayment.kind === "period" ? "subscription authorization" : "payment"} (NT$${nextPayment.amount}) →`
              : `完成${nextPayment.kind === "period" ? "月費定期定額授權" : "付款"}（NT$${nextPayment.amount}）→`}
          </a>
        )}
        <Link href="/" className="btn-ghost">{t("backHome")}</Link>
      </div>
    </main>
  );
}
