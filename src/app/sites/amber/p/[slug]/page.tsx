import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getProductBySlug } from "@/lib/daigou-data";
import { mediaUrl, thumbUrl } from "@/lib/media-url";
import { orderState, effectiveDeadline, ORDER_STATE_ZH } from "@/lib/daigou-deadline";
import { twd } from "../../_data/cart";
import { categoryName } from "../../_data/categories";
import { TENANT_SLUG, SITE } from "../../_data/site";
import { batchTone } from "../../_data/batch-tone";
import { getTenant, tenantOrigin } from "@/lib/tenants";
import { DeadlineBar } from "../../_components/DeadlineBar";
import { Gallery } from "../../_components/Gallery";
import { AddToCart, type OptionView } from "../../_components/AddToCart";
import { ShareLine, ShareCopy } from "../../_components/ShareLine";
import {
  CategoryIcon,
  IconBox,
  IconChevronRight,
  IconShield,
  IconSparkle,
  IconStore,
} from "../../_components/Icons";
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
  const batchView = { defaultDeadlineAt: p.batch.defaultDeadlineAt, status: p.batch.status };
  const state = orderState({ deadlineAt: p.deadlineAt, status: p.status }, batchView, now);
  const deadline = effectiveDeadline({ deadlineAt: p.deadlineAt, status: p.status }, batchView);
  const tone = batchTone(p.batch.id, p.batch.tone);

  const options: OptionView[] = p.options.map((o) => ({
    id: o.id,
    label: o.label,
    price: o.price,
    stock: o.stock,
  }));

  const url = `${tenantOrigin(getTenant(TENANT_SLUG)!)}/p/${p.slug}`;

  return (
    <div className="am-wrap">
      {/* 需求第 7 項：收單時間直接明顯顯示在上方 */}
      <DeadlineBar
        title={p.batch.title}
        deadline={deadline}
        now={now}
        closed={!state.open}
        closedLabel={state.open ? undefined : ORDER_STATE_ZH[state.reason]}
        tone={tone}
      />

      {/* 桌機雙欄：左邊圖（跟著捲）、右邊買。
          手機是單欄，順序仍然是圖 → 名稱 → 價格 → 買，跟原本一樣。 */}
      <div className="am-pdp">
        <div className="am-pdp__media">
          {p.images.length > 0 ? (
            <Gallery images={p.images} name={p.name} />
          ) : (
            <div className="am-card__img am-card__img--none" style={{ borderRadius: "var(--a-radius)" }}>
              <CategoryIcon categoryKey={p.categoryKey} size={40} stroke={1.3} />
              尚無照片
            </div>
          )}
        </div>

        <div className="am-pdp__buy">
          <nav className="am-sub" aria-label="麵包屑" style={{ marginBottom: "0.4rem" }}>
            <a href="/" style={{ textDecoration: "none" }}>
              本檔連線
            </a>
            <IconChevronRight size={13} stroke={2} />
            <span>{p.batch.title}</span>
          </nav>

          <h1 className="am-h1" style={{ marginTop: 0 }}>
            {p.name}
          </h1>

          <p className="am-meta">
            {p.categoryKey && (
              <span>
                <CategoryIcon categoryKey={p.categoryKey} size={15} stroke={1.9} />
                {categoryName(p.categoryKey)}
              </span>
            )}
            {p.preorder && (
              <span>
                <IconSparkle size={15} stroke={1.9} />
                可預購
              </span>
            )}
            <span>
              <IconStore size={15} stroke={1.9} />
              7-11 交貨便
            </span>
          </p>

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

          {/* 買不買得下去的三個疑慮，就放在按鈕旁邊回答，不要逼客人去翻說明頁 */}
          <ul className="am-trust" style={{ marginTop: "1.2rem", flexWrap: "wrap" }}>
            <li>
              <IconShield size={15} stroke={1.9} />
              品牌官網／門市正品
            </li>
            <li>
              <IconBox size={15} stroke={1.9} />
              同檔運費只收一次
            </li>
            <li>
              <IconSparkle size={15} stroke={1.9} />
              買不到全額退款
            </li>
          </ul>

          {/* 分享。Amber 開賣時貼群組，客人也可能轉給朋友——
              手機上點一下就開 LINE 的「傳送給…」，比複製貼上少三步。 */}
          <div className="am-btns" style={{ marginTop: "1.2rem" }}>
            <ShareLine
              text={[
                `${p.name}　${twd(p.price)}`,
                deadline ? `${formatTaipei(deadline)} 截止` : null,
                `【${SITE.shortName}】${p.batch.title}`,
              ]
                .filter(Boolean)
                .join("\n")}
              url={url}
            />
            <ShareCopy url={url} />
          </div>

          <p className="am-field__hint" style={{ marginTop: "1rem" }}>
            連線期間可以一直加購，同一檔的訂單最後會合併成一張出貨單，運費只收一次。
            <a href="/how" style={{ marginInlineStart: "0.3rem" }}>
              看購買流程
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
