import { notFound } from "next/navigation";
import { getHostTenant, getTenantSession } from "@/lib/tenant-auth";
import { getBeanStock } from "@/lib/tenant-data";
// 豆單目錄住在該站的程式碼裡（純資料模組，沒有副作用）。
// 後台只是把它列出來讓店家選狀態，不需要另一份 DB 清單。
import { listBeans } from "@/app/sites/rekat/_data/beans";
import LoginForm from "../LoginForm";

export const dynamic = "force-dynamic";

const twd = (n: number) => `NT$${n.toLocaleString("en-US")}`;

/**
 * 本期供應狀態的編輯畫面。
 *
 * 刻意做成純 HTML 表單（沒有 JS）：店家多半在手機上、出貨前趕時間用，
 * 選一選、按送出、看到結果，不需要等任何東西載入。
 *
 * 這裡只管「現在賣不賣」。要換整份豆單（新品項、新價格）請找 Avalo——
 * 品名、風味家族、插畫母題與產區文案是設計與編輯資產，住在程式碼裡。
 */
export default async function BeansStockPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const hostTenant = await getHostTenant();
  if (!hostTenant) notFound();
  // 沒開線上商店的租戶不該看到這一頁
  if (!hostTenant.shop) notFound();

  const tenant = await getTenantSession();
  if (!tenant) return <LoginForm tenantName={hostTenant.name} error={sp.error} />;

  const [beans, stock] = await Promise.all([
    Promise.resolve(listBeans()),
    getBeanStock(tenant.slug),
  ]);
  const soldOut = new Set(stock.soldOut);
  const hidden = new Set(stock.hidden);

  const updated = stock.updatedAt
    ? new Intl.DateTimeFormat("zh-TW", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Taipei",
      }).format(stock.updatedAt)
    : null;

  const stateOf = (slug: string) =>
    hidden.has(slug) ? "hidden" : soldOut.has(slug) ? "soldout" : "on";

  return (
    <main className="p-wrap">
      <div className="p-head">
        <div>
          <h1 className="p-title">本期供應狀態</h1>
          <p className="p-sub">
            選好每一支的狀態，按下儲存，官網就會立刻換成這一份。
            {updated && `　（上次更新：${updated}）`}
          </p>
        </div>
        <div className="p-actions">
          <a className="p-btn p-btn-ghost" href="/portal/orders">
            訂單管理
          </a>
          <form method="post" action="/api/portal/logout">
            <button type="submit" className="p-btn-link">
              登出
            </button>
          </form>
        </div>
      </div>

      {sp.saved === "1" && (
        <div className="p-msg">已儲存，官網已同步更新。</div>
      )}

      <div className="p-msg">
        <b>三種狀態怎麼選</b>
        <br />
        <b>供應中</b>：正常販售。
        <br />
        <b>售完</b>：官網照常列出這支豆子並標示「本期售完」，但客人不能下單。
        補到貨再改回供應中即可。
        <br />
        <b>下架</b>：官網完全不顯示這支豆子。適合這一季不做了、或還沒到貨的品項。
      </div>

      <form method="post" action="/api/portal/beans" className="p-board-form">
        <div className="p-tablewrap">
          <table className="p-table">
            <thead>
              <tr>
                <th>豆子</th>
                <th>半磅售價</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {beans.map((b) => {
                const cur = stateOf(b.slug);
                return (
                  <tr key={b.slug}>
                    <td>
                      NO.{String(b.no).padStart(2, "0")}　{b.nameZh}
                      <br />
                      <small>
                        {b.country}
                        {b.bundle ? `・${b.bundle.label} ${twd(b.bundle.price)}` : ""}
                      </small>
                    </td>
                    <td className="p-nowrap">{twd(b.price)}</td>
                    <td className="p-nowrap">
                      {/* 每支豆子一組 radio，name 帶 slug，後端逐一讀回來 */}
                      {[
                        ["on", "供應中"],
                        ["soldout", "售完"],
                        ["hidden", "下架"],
                      ].map(([value, label]) => (
                        <label key={value} className="p-check" style={{ marginRight: 14 }}>
                          <input
                            type="radio"
                            name={`s:${b.slug}`}
                            value={value}
                            defaultChecked={cur === value}
                          />
                          {label}
                        </label>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <fieldset className="p-fieldset">
          <legend>官網公告（選填，會顯示在豆單頁最上方）</legend>
          <textarea
            name="note"
            rows={2}
            maxLength={120}
            defaultValue={stock.note ?? ""}
            placeholder="例：本週三、四出貨順延，造成不便敬請見諒"
          />
        </fieldset>

        <button type="submit" className="p-btn">
          儲存
        </button>
      </form>
    </main>
  );
}
