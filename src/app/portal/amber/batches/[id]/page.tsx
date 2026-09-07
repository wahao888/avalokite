import { notFound } from "next/navigation";
import { getHostTenant, getTenantSession } from "@/lib/tenant-auth";
import {
  getBatch,
  listProducts,
  countProducts,
  batchImageBytes,
  sweepImages,
} from "@/lib/daigou-data";
import { formatTaipei, toTaipeiLocalInput } from "@/lib/tw-time";
import { categoryName } from "@/app/sites/amber/_data/categories";
import { priceLabel } from "@/app/sites/amber/_data/cart";
import { thumbUrl } from "@/lib/media-url";
import LoginForm from "../../../LoginForm";

export const dynamic = "force-dynamic";

const STATUS_ZH: Record<string, string> = {
  draft: "草稿",
  open: "進行中",
  closed: "已收單",
  archived: "已封存",
};

/**
 * 佔用量。小於 1MB 時用 KB——一檔剛開始只有幾張照片時，
 * 顯示「0.0 MB」看起來像壞掉，她會以為照片沒存進去。
 */
const size = (bytes: number): string =>
  bytes < 1_048_576
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1_048_576).toFixed(1)} MB`;

export default async function BatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const hostTenant = await getHostTenant();
  if (!hostTenant) notFound();
  if (!hostTenant.daigou) notFound();

  const tenant = await getTenantSession();
  if (!tenant) return <LoginForm tenantName={hostTenant.name} error={sp.error} />;

  // getBatch 的 where 已帶 tenantId：別家的 id 一律 404，
  // 不會洩漏「這個編號存在」這件事。
  const batch = await getBatch(tenant.slug, id);
  if (!batch) notFound();

  const [products, total, imageBytes] = await Promise.all([
    listProducts(tenant.slug, { batchId: batch.id, take: 200 }),
    countProducts(tenant.slug, { batchId: batch.id }),
    batchImageBytes(tenant.slug, batch.id),
  ]);

  // 機會式清掃：不用 cron，趁她開後台的時候順手回收幾筆過期的圖檔。
  void sweepImages(tenant.slug, 5).catch(() => {});

  const isOpen = batch.status === "open";

  return (
    <main className="p-wrap">
      <div className="p-head">
        <div>
          <h1 className="p-title">{batch.title}</h1>
          <p className="p-sub">
            {STATUS_ZH[batch.status] ?? batch.status}
            {batch.defaultDeadlineAt ? `・收單 ${formatTaipei(batch.defaultDeadlineAt)}` : "・未設收單時間"}
            {batch.defaultEtaAt
              ? `・預計到貨 ${formatTaipei(batch.defaultEtaAt, { withTime: false })}`
              : ""}
          </p>
        </div>
        <div className="p-actions">
          <a className="p-btn p-btn-ghost" href="/portal/amber">
            所有連線
          </a>
        </div>
      </div>

      {sp.error && <div className="p-error">操作失敗，請再試一次。</div>}

      <div className="p-stats">
        <div className="p-stat">
          商品<b>{total}</b>
        </div>
        <div className="p-stat">
          照片佔用<b>{size(imageBytes)}</b>
        </div>
      </div>

      {isOpen && (
        <div className="p-dg-sticky" style={{ position: "static", marginTop: 0 }}>
          <a className="p-btn" href={`/portal/amber/products/new?batch=${encodeURIComponent(batch.id)}`}>
            ＋ 上架商品
          </a>
        </div>
      )}

      <h2 className="p-title" style={{ fontSize: "1.1rem", marginTop: "1.8rem" }}>
        商品（{products.length}）
      </h2>

      {products.length === 0 ? (
        <p className="p-empty">這一檔還沒有商品。</p>
      ) : (
        <div className="p-tablewrap">
          <table className="p-table">
            <thead>
              <tr>
                <th></th>
                <th>商品</th>
                <th>售價</th>
                <th>規格</th>
                <th>收單</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.images[0] ? (
                      // 縮圖由 nginx 直送（location ^~ /u/），不經 Node。
                      // 刻意用原生 img：沒有 CDN，t3.micro 不該拿 CPU 做即時最佳化，
                      // 而且尺寸在上傳時就產好了。
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbUrl(p.images[0].key)}
                        alt=""
                        width={44}
                        height={44}
                        style={{ objectFit: "cover", borderRadius: 2, display: "block" }}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                  </td>
                  <td>
                    <a href={`/portal/amber/products/${encodeURIComponent(p.id)}`}>{p.name}</a>
                    <br />
                    <small>{categoryName(p.categoryKey)}</small>
                  </td>
                  <td className="p-nowrap">
                    {priceLabel(p.price, p.options.map((o) => o.price))}
                  </td>
                  <td>
                    {p.options.length === 0 ? "—" : `${p.optionAxis ?? "規格"}：${p.options.length} 種`}
                  </td>
                  <td className="p-nowrap">
                    {p.deadlineAt ? formatTaipei(p.deadlineAt) : "不截止"}
                  </td>
                  <td className="p-nowrap">
                    <a
                      className="p-btn-link"
                      href={`/portal/amber/products/new?batch=${encodeURIComponent(batch.id)}&from=${encodeURIComponent(p.id)}`}
                    >
                      再上一件
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="p-title" style={{ fontSize: "1.1rem", marginTop: "2rem" }}>
        檔期設定
      </h2>

      <form method="post" action="/api/portal/amber/batch" className="p-board-form">
        <input type="hidden" name="action" value="settings" />
        <input type="hidden" name="id" value={batch.id} />
        <div className="p-dg-field">
          <label htmlFor="s-ship">運費（元）</label>
          <input
            id="s-ship"
            type="text"
            inputMode="numeric"
            name="shippingFee"
            defaultValue={batch.shippingFee}
          />
          <p className="p-dg-hint">同一位客人這一檔下幾次單，運費都只收一次。</p>
        </div>
        <div className="p-dg-field">
          <label htmlFor="s-free">滿額免運（元）</label>
          <input
            id="s-free"
            type="text"
            inputMode="numeric"
            name="freeShippingOver"
            defaultValue={batch.freeShippingOver ?? ""}
          />
        </div>
        <button type="submit" className="p-btn">
          儲存設定
        </button>
      </form>

      {isOpen && (
        <>
          <h2 className="p-title" style={{ fontSize: "1.1rem", marginTop: "2rem" }}>
            延長收單
          </h2>
          <form method="post" action="/api/portal/amber/batch" className="p-board-form">
            <input type="hidden" name="action" value="extend" />
            <input type="hidden" name="id" value={batch.id} />
            <div className="p-dg-field">
              <input
                type="datetime-local"
                name="defaultDeadline"
                defaultValue={
                  batch.defaultDeadlineAt ? toTaipeiLocalInput(batch.defaultDeadlineAt) : ""
                }
                required
              />
              <p className="p-dg-hint">
                會把新時間<strong>寫進這一檔的每一件商品</strong>。
                商品的收單時間是建立時複製過去的，所以只改檔期不會影響已上架的商品——
                要整批延長就用這個按鈕。
              </p>
            </div>
            <button type="submit" className="p-btn p-btn-ghost">
              延長全部商品的收單時間
            </button>
          </form>
        </>
      )}

      <h2 className="p-title" style={{ fontSize: "1.1rem", marginTop: "2rem" }}>
        檔期狀態
      </h2>
      <div className="p-actions">
        {isOpen ? (
          <form method="post" action="/api/portal/amber/batch">
            <input type="hidden" name="action" value="close" />
            <input type="hidden" name="id" value={batch.id} />
            <button type="submit" className="p-btn">
              收單（前台全部關閉下單）
            </button>
          </form>
        ) : (
          <form method="post" action="/api/portal/amber/batch">
            <input type="hidden" name="action" value="reopen" />
            <input type="hidden" name="id" value={batch.id} />
            <button type="submit" className="p-btn p-btn-ghost">
              重新開放
            </button>
          </form>
        )}

        {imageBytes > 0 && (
          <form method="post" action="/api/portal/amber/batch">
            <input type="hidden" name="action" value="purge-images" />
            <input type="hidden" name="id" value={batch.id} />
            <button type="submit" className="p-btn p-btn-ghost">
              清除大圖，釋出 {size(imageBytes)}
            </button>
          </form>
        )}
      </div>
      <p className="p-dg-hint">
        「清除大圖」只刪商品頁用的大張照片，<strong>縮圖會留著</strong>——
        歷史訂單、結單畫面與「再上一件」用的都是縮圖，所以清了不會變成一排破圖。
        檔期關閉滿 30 天後也會自動清一次。
      </p>
    </main>
  );
}
