import { thumbUrl } from "@/lib/media-url";
import { orderState, effectiveDeadline } from "@/lib/daigou-deadline";
import { priceLabel } from "../_data/cart";
import { Countdown } from "./Countdown";
import { QuickAdd } from "./QuickAdd";
import type { Tone } from "../_data/batch-tone";

// 商品卡。伺服器元件——只有「＋1」與倒數那兩塊需要 JS。

export type CardProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  status: string;
  deadlineAt: Date | null;
  preorder: boolean;
  options: { price: number | null }[];
  images: { key: string }[];
  batch: { defaultDeadlineAt: Date | null; status: string };
  /** 多檔同開時才顯示；只有一檔的話標了只是雜訊 */
  batchTitle?: string | null;
  batchTone?: Tone;
};

export function ProductCard({ p, now }: { p: CardProduct; now: Date }) {
  const state = orderState(
    { deadlineAt: p.deadlineAt, status: p.status },
    p.batch,
    now,
  );
  const deadline = effectiveDeadline({ deadlineAt: p.deadlineAt, status: p.status }, p.batch);
  const hasOptions = p.options.length > 0;
  const href = `/p/${encodeURIComponent(p.slug)}`;

  return (
    <article className="am-card">
      <a className="am-card__link" href={href}>
        {p.images[0] ? (
          // 縮圖由 nginx 直送（location ^~ /u/），不經 Node。
          // 沒有 CDN、機器是 t3.micro，所以不用 next/image 做即時最佳化——
          // 兩個尺寸在上傳時就產好了。width/height 寫死避免版位跳動。
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="am-card__img"
            src={thumbUrl(p.images[0].key)}
            alt={p.name}
            width={400}
            height={400}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="am-card__img am-card__img--none">尚無照片</div>
        )}
      </a>

      <div className="am-card__body">
        {p.batchTitle && p.batchTone && (
          <span
            className="am-card__batch"
            style={{ color: p.batchTone.ink, background: p.batchTone.soft }}
          >
            {p.batchTitle}
          </span>
        )}
        <a className="am-card__link am-card__name" href={href}>
          {p.name}
        </a>
        <div className="am-card__price">
          {priceLabel(p.price, p.options.map((o) => o.price))}
        </div>

        <div>
          {!state.open ? (
            <span className="am-tag am-tag--closed">
              {state.reason === "expired" ? "已截止" : state.reason === "batch-closed" ? "已收單" : "已下架"}
            </span>
          ) : deadline ? (
            // 伺服器先給絕對時間當保底（也對 SEO 與無 JS 情境友善），
            // 客戶端掛載後才換成「剩 3 天」。兩者不會同時出現。
            <Countdown deadlineISO={deadline.toISOString()} serverNowISO={now.toISOString()} />
          ) : p.preorder ? (
            <span className="am-tag am-tag--pre">可預購</span>
          ) : null}
        </div>

        <div className="am-card__foot">
          {!state.open ? (
            <a className="am-btn am-btn--sm am-btn--ghost am-btn--full" href={href}>
              看商品
            </a>
          ) : hasOptions ? (
            <a className="am-btn am-btn--sm am-btn--ghost am-btn--full" href={href}>
              選規格
            </a>
          ) : (
            <QuickAdd productId={p.id} />
          )}
        </div>
      </div>
    </article>
  );
}
