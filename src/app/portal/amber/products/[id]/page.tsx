import { notFound } from "next/navigation";
import { getHostTenant, getTenantSession } from "@/lib/tenant-auth";
import { getProduct } from "@/lib/daigou-data";
import { formatTaipei, toTaipeiLocalInput } from "@/lib/tw-time";
import { CATEGORIES } from "@/app/sites/amber/_data/categories";
import { twd } from "@/app/sites/amber/_data/cart";
import { orderState, effectiveDeadline } from "@/lib/daigou-deadline";
import { mediaUrl, thumbUrl } from "@/lib/media-url";
import LoginForm from "../../../LoginForm";
import { AddPhotos } from "../../../_components/AddPhotos";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  bad: "資料不完整，請再試一次。",
  deadline: "收單時間的格式不對。",
  notfound: "找不到這件商品。",
};

export default async function ProductPage({
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

  const p = await getProduct(tenant.slug, id);
  if (!p) notFound();

  // 「現在到底能不能下單」由同一個純函式判斷，前台後台不會說不同的話。
  const state = orderState(
    { deadlineAt: p.deadlineAt, status: p.status },
    { defaultDeadlineAt: p.batch.defaultDeadlineAt, status: p.batch.status },
    new Date(),
  );
  const deadline = effectiveDeadline(
    { deadlineAt: p.deadlineAt, status: p.status },
    { defaultDeadlineAt: p.batch.defaultDeadlineAt, status: p.batch.status },
  );

  return (
    <main className="p-wrap">
      <div className="p-head">
        <div>
          <h1 className="p-title">{p.name}</h1>
          <p className="p-sub">
            {p.batch.title}・{twd(p.price)}
            {p.deletedAt ? "・已刪除" : ""}
          </p>
        </div>
        <div className="p-actions">
          <a
            className="p-btn p-btn-ghost"
            href={`/portal/amber/batches/${encodeURIComponent(p.batchId)}`}
          >
            回檔期
          </a>
          <a
            className="p-btn"
            href={`/portal/amber/products/new?batch=${encodeURIComponent(p.batchId)}&from=${encodeURIComponent(p.id)}`}
          >
            再上一件
          </a>
        </div>
      </div>

      {sp.error && <div className="p-error">{ERRORS[sp.error] ?? "操作失敗。"}</div>}

      <div className={state.open ? "p-note" : "p-error"}>
        {state.open
          ? deadline
            ? `目前開放下單，${formatTaipei(deadline)} 截止`
            : "目前開放下單，沒有截止時間"
          : state.reason === "expired"
            ? `已截止（${deadline ? formatTaipei(deadline) : ""}）`
            : state.reason === "batch-closed"
              ? "本檔已收單，前台無法下單"
              : "已下架，前台看不到"}
      </div>

      <h2 className="p-title" style={{ fontSize: "1rem", marginTop: "1.4rem" }}>
        照片
      </h2>

      {p.images.length > 0 && (
        <div className="p-dg-photogrid" style={{ marginTop: "0.6rem" }}>
          {p.images.map((img) => (
            <div key={img.id} className="p-dg-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.fullPurgedAt ? thumbUrl(img.key) : mediaUrl(img.key)}
                alt=""
                width={120}
                height={120}
                loading="lazy"
                decoding="async"
              />
              <div className="p-dg-photo__actions">
                <form method="post" action="/api/portal/amber/product/edit">
                  <input type="hidden" name="action" value="remove-image" />
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="imageId" value={img.id} />
                  <button type="submit" aria-label="移除這張照片">
                    ✕
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 上架之後也要補得了照片——她常常是回台灣才拍得到像樣的圖 */}
      <AddPhotos productId={p.id} existing={p.images.length} />

      <form method="post" action="/api/portal/amber/product/edit" className="p-board-form">
        <input type="hidden" name="id" value={p.id} />
        <input type="hidden" name="action" value="save" />

        <div className="p-dg-field">
          <label htmlFor="e-name">商品名稱</label>
          <input id="e-name" type="text" name="name" defaultValue={p.name} required />
        </div>

        <div className="p-dg-field">
          <label htmlFor="e-price">售價（元）</label>
          <input
            id="e-price"
            type="text"
            inputMode="numeric"
            name="price"
            defaultValue={p.price}
            required
          />
          {p.options.length > 0 && (
            <p className="p-dg-hint">
              有規格價的規格會蓋過這個數字：
              {p.options.map((o) => `${o.label}${o.price != null ? ` ${twd(o.price)}` : ""}`).join("、")}
            </p>
          )}
        </div>

        <div className="p-dg-field">
          <label htmlFor="e-cat">分類</label>
          <select id="e-cat" name="categoryKey" defaultValue={p.categoryKey ?? ""}>
            <option value="">未分類</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="p-dg-field">
          <label htmlFor="e-deadline">收單時間（台北時間，留空 = 不截止）</label>
          <input
            id="e-deadline"
            type="datetime-local"
            name="deadline"
            defaultValue={p.deadlineAt ? toTaipeiLocalInput(p.deadlineAt) : ""}
          />
          <p className="p-dg-hint">
            這個值是上架時從檔期複製過來的，之後改檔期不會動到它。
            要整批延長請用檔期頁的「延長全部商品」。
          </p>
        </div>

        <div className="p-dg-field">
          <label htmlFor="e-status">狀態</label>
          <select id="e-status" name="status" defaultValue={p.status}>
            <option value="live">上架中</option>
            <option value="hidden">下架（前台看不到）</option>
            <option value="draft">草稿</option>
          </select>
        </div>

        <label className="p-check">
          <input type="checkbox" name="preorder" defaultChecked={p.preorder} />
          允許預購（庫存 0 也能下單）
        </label>
        <label className="p-check">
          <input type="checkbox" name="showStock" defaultChecked={p.showStock} />
          前台顯示剩餘數量
        </label>

        <div className="p-dg-field">
          <label htmlFor="e-stock">庫存（留空 = 不限量）</label>
          <input
            id="e-stock"
            type="text"
            inputMode="numeric"
            name="stock"
            defaultValue={p.stock ?? ""}
          />
        </div>

        <div className="p-dg-field">
          <label htmlFor="e-note">商品說明</label>
          <textarea id="e-note" name="note" rows={4} defaultValue={p.note ?? ""} />
        </div>

        <div className="p-dg-sticky">
          <button type="submit" className="p-btn">
            儲存
          </button>
        </div>
      </form>

      {!p.deletedAt && (
        <form
          method="post"
          action="/api/portal/amber/product/edit"
          style={{ marginTop: "2rem" }}
        >
          <input type="hidden" name="action" value="archive" />
          <input type="hidden" name="id" value={p.id} />
          <button type="submit" className="p-btn-link">
            刪除這件商品
          </button>
          <p className="p-dg-hint">
            只是隱藏起來，不會真的刪掉——已下單的紀錄仍然看得到品名與價格，
            而且之後還能用「再上一件」重新上架。
          </p>
        </form>
      )}
    </main>
  );
}
