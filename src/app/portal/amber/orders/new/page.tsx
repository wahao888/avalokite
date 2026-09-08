import { notFound } from "next/navigation";
import { getHostTenant, getTenantSession } from "@/lib/tenant-auth";
import { getBatch, openBatches, listProducts, listMembers } from "@/lib/daigou-data";
import { BatchPicker } from "../../BatchPicker";
import { thumbUrl } from "@/lib/media-url";
import { twd } from "@/app/sites/amber/_data/cart";
import LoginForm from "../../../LoginForm";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  who: "姓名與手機都要填，而且手機格式要正確。",
  empty: "至少要填一個商品的數量。",
  batch: "找不到那一檔連線。",
  rejected: "有商品目前無法下單（可能已被刪除）。",
};

// 代客下單。
//
// LINE 社群的老客人會繼續打「+1」，這一頁是把那些單收進系統的入口。
// 收不進來的話她就要維護兩套帳，而採購清單與結單金額都會是錯的。
//
// 刻意不受收單截止限制——群組 +1 常常就是截止之後才補進來的，她說收就收。

export default async function ManualOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const hostTenant = await getHostTenant();
  if (!hostTenant) notFound();
  if (!hostTenant.daigou) notFound();

  const tenant = await getTenantSession();
  if (!tenant) return <LoginForm tenantName={hostTenant.name} error={sp.error} />;

  // 同上：同時開兩檔以上就問她要下到哪一趟，不要替她猜。
  // 代客下單猜錯的後果跟上架一樣——這位客人的品項會併進錯的那張結單。
  const openList = sp.batch ? [] : await openBatches(tenant.slug);
  if (!sp.batch && openList.length > 1) {
    return (
      <BatchPicker
        title="這一筆要下到哪一檔？"
        hint={`目前有 ${openList.length} 檔連線同時進行。選錯的話這位客人的品項會併進錯的結單。`}
        batches={openList}
        basePath="/portal/amber/orders/new"
      />
    );
  }

  const batch = sp.batch ? await getBatch(tenant.slug, sp.batch) : (openList[0] ?? null);
  if (!batch) {
    return (
      <main className="p-wrap">
        <h1 className="p-title">還沒有進行中的連線</h1>
        <a className="p-btn" href="/portal/amber">
          先開一檔連線
        </a>
      </main>
    );
  }

  const [products, members] = await Promise.all([
    listProducts(tenant.slug, { batchId: batch.id, take: 300 }),
    listMembers(tenant.slug, { take: 200 }),
  ]);

  return (
    <main className="p-wrap">
      <div className="p-head">
        <div>
          <h1 className="p-title">代客下單</h1>
          <p className="p-sub">
            {batch.title}・把 LINE 群組裡 +1 的單打進系統，採購清單與結單才會是對的。
          </p>
        </div>
        <div className="p-actions">
          <a className="p-btn p-btn-ghost" href={`/portal/amber/batches/${encodeURIComponent(batch.id)}`}>
            回檔期
          </a>
        </div>
      </div>

      {sp.error && <div className="p-error">{ERRORS[sp.error] ?? "操作失敗。"}</div>}

      <form method="post" action="/api/portal/amber/manual-order">
        <input type="hidden" name="batchId" value={batch.id} />

        <div className="p-dg-field">
          <label htmlFor="m-phone">客人手機</label>
          <input
            id="m-phone"
            type="text"
            inputMode="tel"
            name="phone"
            list="member-phones"
            required
            placeholder="0912345678"
          />
          {/* 已經買過的客人直接選，手機是歸戶鍵——打錯一碼就會變成兩個人 */}
          <datalist id="member-phones">
            {members.map((m) => (
              <option key={m.id} value={m.phoneDigits ?? ""}>
                {m.name ?? ""}
              </option>
            ))}
          </datalist>
          <p className="p-dg-hint">
            同一支手機會自動歸到同一位客人，訂單也會併進她這一檔的結單。
          </p>
        </div>

        <div className="p-dg-field">
          <label htmlFor="m-name">姓名</label>
          <input id="m-name" type="text" name="name" required />
        </div>

        <div className="p-dg-field">
          <label htmlFor="m-line">LINE 名稱（選填）</label>
          <input id="m-line" type="text" name="lineId" />
        </div>

        <h2 className="p-title" style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>
          要買什麼
        </h2>
        <p className="p-dg-hint">只填有要的那幾項，其餘留空。</p>

        {products.length === 0 ? (
          <p className="p-empty">這一檔還沒有商品。</p>
        ) : (
          products.map((p) => (
            <div key={p.id} className="p-dg-purchase">
              <div className="p-dg-purchase__head">
                {p.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbUrl(p.images[0].key)} alt="" width={44} height={44} loading="lazy" />
                ) : null}
                <div className="p-dg-purchase__name">
                  <strong>{p.name}</strong>
                  <div>{twd(p.price)}</div>
                </div>
                {p.options.length === 0 && (
                  <label className="p-dg-purchase__got">
                    <span>數量</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      name={`qty:${p.id}:`}
                      aria-label={`${p.name} 數量`}
                    />
                  </label>
                )}
              </div>

              {p.options.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                  {p.options.map((o) => (
                    <label key={o.id} className="p-dg-purchase__got">
                      <span>
                        {o.label}
                        {o.price != null && o.price !== p.price ? ` ${twd(o.price)}` : ""}
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        name={`qty:${p.id}:${o.id}`}
                        aria-label={`${p.name} ${o.label} 數量`}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        <div className="p-dg-field">
          <label htmlFor="m-note">備註</label>
          <input id="m-note" type="text" name="note" placeholder="例：群組 +1 補單" />
        </div>

        <div className="p-dg-sticky">
          <button type="submit" className="p-btn">
            建立訂單
          </button>
        </div>
        <p className="p-dg-hint">
          收件資料會沿用這位客人上一筆訂單；沒有的話先留「待確認」，裝箱前再補。
        </p>
      </form>
    </main>
  );
}
