import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getProductBySlug } from "@/lib/daigou-data";
import { mediaUrl, thumbUrl } from "@/lib/media-url";
import { orderState, effectiveDeadline, ORDER_STATE_ZH } from "@/lib/daigou-deadline";
import { twd } from "../../_data/cart";
import { categoryName } from "../../_data/categories";
import { TENANT_SLUG, SITE } from "../../_data/site";
import { getTenant, tenantOrigin } from "@/lib/tenants";
import { DeadlineBar } from "../../_components/DeadlineBar";
import { AddToCart, type OptionView } from "../../_components/AddToCart";
import { ShareLine, ShareCopy } from "../../_components/ShareLine";
import { formatTaipei } from "@/lib/tw-time";

export const dynamic = "force-dynamic";

/**
 * OG 預覽卡。連結是貼在 LINE 群組裡的，那張卡直接決定點擊率。
 *
 * 刻意**用商品主圖當 OG**，不做動態 ImageResponse：
 * 零額外運算（t3.micro 沒有多餘的 CPU）、不必動 next.config 的 images 設定，
 * 而且客人在群組裡想看的本來就是商品長怎樣。
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(TENANT_SLUG, slug);
  if (!p) return { title: "找不到商品" };

  const img = p.images[0];
  return {
    title: p.name,
    description: `${twd(p.price)}｜${p.batch.title}`,
    openGraph: {
      title: p.name,
      description: `${twd(p.price)}｜${p.batch.title}`,
      images: img ? [{ url: img.fullPurgedAt ? thumbUrl(img.key) : mediaUrl(img.key) }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(TENANT_SLUG, slug);
  if (!p || p.status !== "live") notFound();

  const now = new Date();
  const state = orderState(
    { deadlineAt: p.deadlineAt, status: p.status },
    { defaultDeadlineAt: p.batch.defaultDeadlineAt, status: p.batch.status },
    now,
  );
  const deadline = effectiveDeadline(
    { deadlineAt: p.deadlineAt, status: p.status },
    { defaultDeadlineAt: p.batch.defaultDeadlineAt, status: p.batch.status },
  );

  const options: OptionView[] = p.options.map((o) => ({
    id: o.id,
    label: o.label,
    price: o.price,
    stock: o.stock,
  }));

  return (
    <div className="am-wrap">
      {/* 需求第 7 項：收單時間直接明顯顯示在上方 */}
      <DeadlineBar
        title={p.batch.title}
        deadline={deadline}
        now={now}
        closed={!state.open}
        closedLabel={state.open ? undefined : ORDER_STATE_ZH[state.reason]}
      />

      {p.images.length > 0 && (
        <div className="am-gallery">
          {p.images.map((img, i) => (
            // 大圖已被清掉的舊商品退回用縮圖，不要變成破圖
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.id}
              src={img.fullPurgedAt ? thumbUrl(img.key) : mediaUrl(img.key)}
              alt={`${p.name} 照片 ${i + 1}`}
              width={img.width}
              height={img.height}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : undefined}
              decoding="async"
            />
          ))}
        </div>
      )}

      <h1 className="am-h1">{p.name}</h1>
      {/* 沒分類就不要印「未分類」——那是給後台看的狀態，對客人是雜訊 */}
      {(p.categoryKey || p.preorder) && (
        <p className="am-sub">
          {[p.categoryKey ? categoryName(p.categoryKey) : null, p.preorder ? "可預購" : null]
            .filter(Boolean)
            .join("・")}
        </p>
      )}
      <p className="am-price">{twd(p.price)}</p>

      {p.note && <p className="am-desc">{p.note}</p>}

      <AddToCart
        productId={p.id}
        options={options}
        basePrice={p.price}
        axis={p.optionAxis}
        canOrder={state.open}
        closedLabel={state.open ? "" : ORDER_STATE_ZH[state.reason]}
        preorder={p.preorder}
        showStock={p.showStock}
        productStock={p.stock}
      />

      {/* 分享。Amber 開賣時貼群組，客人也可能轉給朋友——
          手機上點一下就開 LINE 的「傳送給…」，比複製貼上少三步。 */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1.2rem" }}>
        <ShareLine
          text={[
            `${p.name}　${twd(p.price)}`,
            deadline ? `⏰ ${formatTaipei(deadline)} 截止` : null,
            `【${SITE.shortName}】${p.batch.title}`,
          ]
            .filter(Boolean)
            .join("\n")}
          url={`${tenantOrigin(getTenant(TENANT_SLUG)!)}/p/${p.slug}`}
        />
        <ShareCopy url={`${tenantOrigin(getTenant(TENANT_SLUG)!)}/p/${p.slug}`} />
      </div>

      <p className="am-field__hint" style={{ marginTop: "1.2rem" }}>
        連線期間可以一直加購，同一檔的訂單最後會合併成一張出貨單，運費只收一次。
      </p>
    </div>
  );
}
