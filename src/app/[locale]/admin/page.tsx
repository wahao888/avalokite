import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { getProduct } from "@/lib/products";
import CancelSubButton from "@/components/CancelSubButton";

export const dynamic = "force-dynamic";

const cellStyle: React.CSSProperties = {
  padding: "0.7rem 0.8rem",
  borderBottom: "1px solid var(--border)",
  fontSize: "0.8rem",
  verticalAlign: "top",
  textAlign: "left",
};
const headStyle: React.CSSProperties = {
  ...cellStyle,
  fontFamily: "var(--font-mono)",
  fontSize: "0.62rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--muted)",
};

function fmtDate(d: Date | null) {
  return d ? new Date(d).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) : "-";
}

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; suberr?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { error, suberr } = await searchParams;

  if (!(await isAdmin())) {
    return (
      <main className="page-wrap page-wrap-narrow">
        <div className="mono-label">ADMIN</div>
        <h1 className="section-title">後台登入</h1>
        <form className="form-panel" method="post" action="/api/admin/login">
          {error === "1" && <div className="form-feedback err">密碼錯誤</div>}
          {error === "locked" && (
            <div className="form-feedback err">嘗試次數過多，請 10 分鐘後再試</div>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="ad-pw">管理密碼</label>
            <input id="ad-pw" name="password" type="password" required className="form-input" />
          </div>
          <button type="submit" className="btn-primary">登入</button>
        </form>
      </main>
    );
  }

  const [orders, subscriptions, inquiries] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { payments: true },
    }),
    prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { order: true },
    }),
    prisma.inquiry.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  return (
    <main className="page-wrap" style={{ maxWidth: 1280 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="mono-label">ADMIN</div>
          <h1 className="section-title">營運後台</h1>
        </div>
        <form method="post" action="/api/admin/logout">
          <button type="submit" className="btn-ghost">登出</button>
        </form>
      </div>

      <div className="cart-section-head">訂單（{orders.length}）</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={headStyle}>編號</th>
              <th style={headStyle}>客戶</th>
              <th style={headStyle}>品項</th>
              <th style={headStyle}>一次性(未稅)</th>
              <th style={headStyle}>月費(未稅)</th>
              <th style={headStyle}>狀態</th>
              <th style={headStyle}>付款</th>
              <th style={headStyle}>時間</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const items = JSON.parse(o.items) as { sku: string; qty: number }[];
              return (
                <tr key={o.id}>
                  <td style={cellStyle}><code>{o.id}</code></td>
                  <td style={cellStyle}>
                    {o.name}
                    <br />
                    <span style={{ color: "var(--muted)" }}>{o.email}<br />{o.phone}</span>
                    {o.taxId && <><br />統編 {o.taxId}</>}
                  </td>
                  <td style={cellStyle}>
                    {items.map((i) => (
                      <div key={i.sku}>
                        {getProduct(i.sku)?.i18n["zh-TW"].name ?? i.sku} × {i.qty}
                      </div>
                    ))}
                    {o.note && <div style={{ color: "var(--muted)" }}>備註：{o.note}</div>}
                  </td>
                  <td style={cellStyle}>{o.oneTimeTotal ? `NT$${o.oneTimeTotal.toLocaleString()}` : "-"}</td>
                  <td style={cellStyle}>{o.monthlyTotal ? `NT$${o.monthlyTotal.toLocaleString()}/月` : "-"}</td>
                  <td style={cellStyle}><span className={`badge ${o.status}`}>{o.status}</span></td>
                  <td style={cellStyle}>
                    {o.payments.map((p) => (
                      <div key={p.id}>
                        {p.kind} NT${p.amount.toLocaleString()}{" "}
                        <span className={`badge ${p.status}`}>{p.status}</span>
                      </div>
                    ))}
                  </td>
                  <td style={cellStyle}>{fmtDate(o.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="cart-section-head">訂閱（{subscriptions.length}）</div>
      {suberr && (
        <div className="form-feedback err" style={{ marginBottom: "0.8rem" }}>
          {suberr === "ecpay"
            ? "綠界終止失敗，請查看該筆的 cancelResult 或改用綠界後台操作。"
            : suberr === "exception"
              ? "終止時發生錯誤，請查看伺服器 log。"
              : "操作失敗，請確認訂閱是否存在。"}
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={headStyle}>訂單</th>
              <th style={headStyle}>客戶</th>
              <th style={headStyle}>方案</th>
              <th style={headStyle}>月費(含稅)</th>
              <th style={headStyle}>狀態</th>
              <th style={headStyle}>起扣日 / 連結</th>
              <th style={headStyle}>成功期數</th>
              <th style={headStyle}>最近扣款</th>
              <th style={headStyle}>綠界授權單號</th>
              <th style={headStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((s) => (
              <tr key={s.id}>
                <td style={cellStyle}><code>{s.orderId}</code></td>
                <td style={cellStyle}>{s.order.name}<br /><span style={{ color: "var(--muted)" }}>{s.order.email}</span></td>
                <td style={cellStyle}>
                  {s.sku.split("+").map((sku) => (
                    <div key={sku}>{getProduct(sku)?.i18n["zh-TW"].name ?? sku}</div>
                  ))}
                </td>
                <td style={cellStyle}>NT${s.monthlyAmount.toLocaleString()}</td>
                <td style={cellStyle}><span className={`badge ${s.status}`}>{s.status}</span></td>
                <td style={cellStyle}>
                  {fmtDate(s.startsAt)}
                  <br />
                  <span style={{ color: "var(--muted)" }}>
                    {s.authLinkSentAt ? `連結已寄 ${fmtDate(s.authLinkSentAt)}` : "連結未寄"}
                  </span>
                </td>
                <td style={cellStyle}>{s.totalSuccessTimes}</td>
                <td style={cellStyle}>{fmtDate(s.lastChargeAt)}</td>
                <td style={cellStyle}>{s.gwsr ?? "-"}</td>
                <td style={cellStyle}>
                  {s.status === "cancelled" ? "已終止" : <CancelSubButton id={s.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="form-note" style={{ marginTop: "0.8rem" }}>
        ✦ 「終止扣款」會呼叫綠界終止定期定額授權，<strong>終止後無法重啟</strong>，需重新下單。若 API 失敗，仍可登入綠界廠商後台 → 信用卡收單 → 定期定額查詢，以授權單號（gwsr）手動終止。
      </p>

      <div className="cart-section-head">詢問單（{inquiries.length}）</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={headStyle}>#</th>
              <th style={headStyle}>客戶</th>
              <th style={headStyle}>服務 / 預算</th>
              <th style={headStyle}>內容</th>
              <th style={headStyle}>時間</th>
              <th style={headStyle}>處理</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map((q) => (
              <tr key={q.id} style={q.handled ? { opacity: 0.5 } : undefined}>
                <td style={cellStyle}>{q.id}</td>
                <td style={cellStyle}>
                  {q.name}
                  <br />
                  <span style={{ color: "var(--muted)" }}>{q.email}<br />{q.phone ?? ""}</span>
                </td>
                <td style={cellStyle}>{q.service ?? "-"}<br />{q.budget ?? "-"}</td>
                <td style={{ ...cellStyle, maxWidth: 360, whiteSpace: "pre-wrap" }}>{q.message}</td>
                <td style={cellStyle}>{fmtDate(q.createdAt)}</td>
                <td style={cellStyle}>
                  {q.handled ? (
                    "✓ 已處理"
                  ) : (
                    <form method="post" action="/api/admin/handle-inquiry">
                      <input type="hidden" name="id" value={q.id} />
                      <button type="submit" className="cart-remove" style={{ color: "var(--moss)" }}>
                        標記已處理
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
