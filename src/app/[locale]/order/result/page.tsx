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

  // 還有未完成的付款／授權 → 引導完成下一筆（cancelled 的舊授權不算）
  const nextPayment = order?.payments.find((p) => p.status === "pending");
  // 建置已付、只剩維護授權：這是每一筆建置訂單的必經狀態，
  // 不能沿用「等待付款確認」的文案——客戶剛刷卡成功，看到那句會以為刷失敗。
  const awaitingCare =
    !!order &&
    nextPayment?.kind === "period" &&
    order.payments.some((p) => p.kind === "onetime" && p.status === "paid");

  let heading = t("failTitle");
  let desc = t("failDesc");
  if (!error && order) {
    if (awaitingCare) {
      heading = t("careAuthTitle");
      desc = t("careAuthDesc");
    } else if (order.status === "paid") {
      heading = t("successTitle");
      desc = t("successDesc");
    } else if (order.status === "pending" || order.status === "partial") {
      heading = t("pendingTitle");
      desc = t("pendingDesc");
    }
  }

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

      {awaitingCare && (
        <p className="cart-monthly-note" style={{ marginBottom: "1.5rem" }}>
          ✦ {t("careAuthNote")}
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
