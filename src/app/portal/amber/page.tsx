import { notFound } from "next/navigation";
import { getHostTenant, getTenantSession } from "@/lib/tenant-auth";
import { listBatches, countProducts } from "@/lib/daigou-data";
import { formatTaipei, toTaipeiLocalInput } from "@/lib/tw-time";
import { SHIP_PLANS, SHIP_PLAN_ZH } from "@/app/sites/amber/_data/shipping";
import LoginForm from "../LoginForm";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  bad: "資料不完整，請再試一次。",
  deadline: "收單時間的格式不對。",
  eta: "預計到貨日的格式不對。",
  notfound: "找不到那一檔連線。",
};

const STATUS_ZH: Record<string, string> = {
  draft: "草稿",
  open: "進行中",
  closed: "已收單",
  archived: "已封存",
};

export default async function AmberHome({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  const hostTenant = await getHostTenant();
  if (!hostTenant) notFound();
  // 不是代購型的租戶不該看到這一整區
  if (!hostTenant.daigou) notFound();

  const tenant = await getTenantSession();
  if (!tenant) return <LoginForm tenantName={hostTenant.name} error={sp.error} />;

  const batches = await listBatches(tenant.slug);
  const counts = await Promise.all(
    batches.map((b) => countProducts(tenant.slug, { batchId: b.id })),
  );

  const open = batches.filter((b) => b.status === "open");

  // 新檔期的預設收單時間：七天後的台北 23:00。
  // 她幾乎一定會改，但一個合理的預設值省掉「先想今天幾號」這一步。
  const suggested = new Date();
  suggested.setDate(suggested.getDate() + 7);
  const suggestedLocal = `${toTaipeiLocalInput(suggested).slice(0, 10)}T23:00`;

  return (
    <main className="p-wrap">
      <div className="p-head">
        <div>
          <h1 className="p-title">{tenant.name}・連線管理</h1>
          <p className="p-sub">一檔連線 = 一次出貨。商品掛在檔期底下，並繼承它的收單時間。</p>
        </div>
        <div className="p-actions">
          <a className="p-btn p-btn-ghost" href="/portal/amber/settlements">
            結單
          </a>
          <a className="p-btn p-btn-ghost" href="/portal/amber/members">
            客人
          </a>
          <a className="p-btn p-btn-ghost" href="/portal/amber/products">
            所有商品
          </a>
          <form method="post" action="/api/portal/logout">
            <button type="submit" className="p-btn-link">
              登出
            </button>
          </form>
        </div>
      </div>

      {sp.error && <div className="p-error">{ERRORS[sp.error] ?? "操作失敗，請再試一次。"}</div>}

      {open.length > 0 && (
        <div className="p-dg-sticky" style={{ position: "static", marginTop: 0 }}>
          <a className="p-btn" href={`/portal/amber/products/new?batch=${encodeURIComponent(open[0].id)}`}>
            ＋ 上架商品到「{open[0].title}」
          </a>
        </div>
      )}

      <h2 className="p-title" style={{ fontSize: "1.1rem", marginTop: "1.8rem" }}>
        連線檔期
      </h2>

      {batches.length === 0 ? (
        <p className="p-empty">還沒有任何連線。先在下面開一檔，才能開始上架商品。</p>
      ) : (
        <div className="p-tablewrap">
          <table className="p-table">
            <thead>
              <tr>
                <th>檔期</th>
                <th>狀態</th>
                <th>收單時間</th>
                <th>商品</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b, i) => (
                <tr key={b.id} className={b.status === "archived" ? "done" : ""}>
                  <td>
                    <a href={`/portal/amber/batches/${encodeURIComponent(b.id)}`}>{b.title}</a>
                  </td>
                  <td className="p-nowrap">{STATUS_ZH[b.status] ?? b.status}</td>
                  <td className="p-nowrap">
                    {b.defaultDeadlineAt ? formatTaipei(b.defaultDeadlineAt) : "未設定"}
                  </td>
                  <td className="p-nowrap">{counts[i]} 件</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="p-title" style={{ fontSize: "1.1rem", marginTop: "2rem" }}>
        開一檔新連線
      </h2>
      <form method="post" action="/api/portal/amber/batch" className="p-board-form">
        <input type="hidden" name="action" value="create" />

        <div className="p-dg-field">
          <label htmlFor="b-title">檔期名稱</label>
          <input id="b-title" type="text" name="title" required placeholder="例：9 月韓國連線" />
        </div>

        <div className="p-dg-field">
          <label htmlFor="b-deadline">預設收單時間（台北時間）</label>
          <input
            id="b-deadline"
            type="datetime-local"
            name="defaultDeadline"
            defaultValue={suggestedLocal}
          />
          <p className="p-dg-hint">
            商品會繼承這個時間，個別商品仍可另外設定。留空 = 不設收單（現貨用）。
          </p>
        </div>

        <div className="p-dg-field">
          <label htmlFor="b-eta">預計到貨日</label>
          <input id="b-eta" type="date" name="defaultEta" />
          <p className="p-dg-hint">開結單時會帶入，之後每張結單都可以個別調整。</p>
        </div>

        <div className="p-dg-field">
          <label htmlFor="b-plan">運費方案</label>
          <select id="b-plan" name="shipPlan" defaultValue="standard">
            {SHIP_PLANS.map((k) => (
              <option key={k} value={k}>
                {SHIP_PLAN_ZH[k]}
              </option>
            ))}
          </select>
          <p className="p-dg-hint">
            7-11 交貨便的運費<strong>依申報價值分級</strong>（每滿 1,000 元跳一級）。
            選自動的話系統會依實際裝箱金額算，不會發生「一單 4,300 卻只收 60」的少收。
          </p>
        </div>

        <div className="p-dg-field">
          <label htmlFor="b-ship">固定運費（元）</label>
          <input id="b-ship" type="text" inputMode="numeric" name="shippingFee" placeholder="60" />
          <p className="p-dg-hint">
            只有選「固定金額」時才會用到。運費在<strong>結單</strong>層級收，
            同一位客人這一檔下幾次單都只收一次。
          </p>
        </div>

        <div className="p-dg-field">
          <label htmlFor="b-free">滿額免運（元，留空 = 沒有）</label>
          <input id="b-free" type="text" inputMode="numeric" name="freeShippingOver" />
        </div>

        <div className="p-dg-sticky" style={{ position: "static" }}>
          <button type="submit" className="p-btn">
            建立檔期
          </button>
        </div>
      </form>
    </main>
  );
}
