import type { Metadata } from "next";

import { listBatches, countProducts } from "@/lib/daigou-data";
import { formatTaipei } from "@/lib/tw-time";
import { TENANT_SLUG, SITE } from "../_data/site";
import { batchTone } from "../_data/batch-tone";
import { HelpCta } from "../_components/Blocks";
import { AmberMark } from "../_components/Logo";
import {
  IconCalendar,
  IconChat,
  IconChevronRight,
  IconClock,
  IconPlane,
  IconBox,
} from "../_components/Icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "連線總覽",
  description: "AmberPick 進行中與已結束的各國連線檔期、收單時間與預計到貨日。",
};

// 連線總覽。
//
// 為什麼值得一頁：代購最大的信任成本是「這家有在跑嗎」。
// 一張列出「跑過哪幾趟、什麼時候收單、什麼時候到貨」的表，
// 比任何一句自我介紹都有說服力——而這些資料本來就在資料庫裡，
// 不必額外維護。
//
// 已結束的檔期刻意保留在這裡（不連到商品，商品早就下架了），
// 它們是紀錄不是貨架。

const STATUS: Record<string, { label: string; done: boolean }> = {
  open: { label: "進行中", done: false },
  closed: { label: "已收單", done: true },
  draft: { label: "準備中", done: true },
  archived: { label: "已封存", done: true },
};

export default async function LineupsPage() {
  const batches = await listBatches(TENANT_SLUG);

  // 草稿是還沒對外的檔期，客人不該看到
  const visible = batches.filter((b) => b.status !== "draft");

  const rows = await Promise.all(
    visible.map(async (b) => ({
      b,
      count: await countProducts(TENANT_SLUG, { batchId: b.id, status: "live" }),
    })),
  );

  const open = rows.filter((r) => r.b.status === "open");
  const past = rows.filter((r) => r.b.status !== "open");

  const Card = ({ b, count }: (typeof rows)[number]) => {
    const tone = batchTone(b.id, b.tone);
    const live = b.status === "open";
    const st = STATUS[b.status] ?? { label: b.status, done: true };

    return (
      <article
        className="am-feat__c"
        style={live ? { borderColor: tone.line } : undefined}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <span
            className="am-tag"
            style={live ? { color: tone.ink, background: tone.soft } : undefined}
          >
            {st.label}
          </span>
          <span className="am-line__spec">{count} 件商品</span>
        </div>

        <h3 style={{ fontSize: "1.02rem" }}>{b.title}</h3>

        <p style={{ display: "grid", gap: "0.25rem", marginTop: "0.5rem" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            <IconClock size={15} stroke={1.9} />
            收單 {b.defaultDeadlineAt ? formatTaipei(b.defaultDeadlineAt) : "不設限"}
          </span>
          {b.defaultEtaAt && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <IconPlane size={15} stroke={1.9} />
              預計到貨 {formatTaipei(b.defaultEtaAt)}
            </span>
          )}
        </p>

        {b.note && <p style={{ marginTop: "0.5rem" }}>{b.note}</p>}

        {live && (
          <div style={{ marginTop: "0.9rem" }}>
            <a className="am-btn am-btn--sm am-btn--ghost" href={`/?b=${encodeURIComponent(b.id)}`}>
              看這一檔的商品
              <IconChevronRight size={15} stroke={2} />
            </a>
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="am-wrap">
      <header className="am-pagehead">
        <p className="am-eyebrow">
          <IconCalendar size={14} stroke={2} />
          連線總覽
        </p>
        <h1>每一趟連線</h1>
        <p>
          一檔連線就是一趟採購行程，有自己的收單時間、預計到貨日與運費。
          進行中的可以直接下單，已結束的留在這裡當紀錄。
        </p>
      </header>

      <section className="am-section">
        <div className="am-section__head">
          <h2>進行中</h2>
          <p>收單時間一到就會關閉，來得及的話別錯過。</p>
        </div>
        {open.length === 0 ? (
          <>
            <p className="am-empty">
              <AmberMark size={34} stroke={1.3} className="am-empty__i" />
              目前沒有進行中的連線。
            </p>
            {SITE.lineAddUrl && (
              <div className="am-btns" style={{ justifyContent: "center", marginTop: "1rem" }}>
                <a className="am-btn am-btn--accent" href={SITE.lineAddUrl}>
                  <IconChat size={17} stroke={1.9} />
                  加 LINE 收開賣通知
                </a>
              </div>
            )}
          </>
        ) : (
          <div className="am-feat">
            {open.map((r) => (
              <Card key={r.b.id} {...r} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="am-section">
          <div className="am-section__head">
            <h2>已結束</h2>
            <p>商品已下架，資料保留供對帳與查詢。</p>
          </div>
          <div className="am-feat">
            {past.map((r) => (
              <Card key={r.b.id} {...r} />
            ))}
          </div>
        </section>
      )}

      <div className="am-callout" style={{ marginTop: "2.5rem" }}>
        <IconBox size={19} stroke={1.8} />
        <p>
          <strong>不同連線分開結帳。</strong>
          它們是不同國家、不同時間回台灣的兩個包裹，各自計算運費。
          購物車會自動幫你分組。
        </p>
      </div>

      <HelpCta
        title="想找的東西這一檔沒有？"
        body="告訴我們你要什麼，下一趟可以幫你留意。"
      />
    </div>
  );
}
