import Link from "next/link";
import HeroMelt from "./_components/HeroMelt";
import FlavorMarquee from "./_components/FlavorMarquee";
import MeltEdge from "./_components/MeltEdge";
import FlavorCard from "./_components/FlavorCard";
import WorksList from "./_components/WorksList";
import StoreMap from "./_components/StoreMap";
import OpenStatus, { HoursTable } from "./_components/OpenStatus";
import Reveal, { RevealItem, RevealStagger } from "./_components/Reveal";
import { ScoopMark } from "./_components/ScoopArt";
import { boardHeadline, boardUpdatedLabel, getTodayBoard } from "./_data/board";
import { listFeatured } from "./_data/events";
import { listHighlights, listSignature } from "./_data/flavors";
import { ML, SITE } from "./_data/site";

// 今日供應板住在資料庫，店家隨時會改。ISR 60 秒：
// 讀 DB 的頁面若不宣告 revalidate，會在 build 當下被靜態烤死。
export const revalidate = 60;

export default async function HomePage() {
  const [board, highlights, signature, events] = await Promise.all([
    getTodayBoard(),
    listHighlights(3),
    listSignature(8),
    listFeatured(3),
  ]);

  const heroColors = board.entries.slice(0, 5).map((e) => e.color);
  const updated = boardUpdatedLabel(board.updatedAt);

  return (
    <>
      <HeroMelt colors={heroColors} statusLine={boardHeadline(board)} />

      {/* ── 今日口味跑馬燈，下緣融化滴進紙色區 ─────
          這組黃色色帶 + 滴垂就是店家 IG 限動的構圖，
          等於把品牌自己的視覺語言直接搬上網站。 */}
      {board.entries.length > 0 && (
        <>
          <FlavorMarquee items={board.entries.map((e) => ({ key: e.key, zh: e.zh, en: e.en }))} />
          <MeltEdge />
        </>
      )}

      {/* ── 今日供應板 ───────────────────────────── */}
      <section className="ml-sec ml-sec--tight ml-sec--after-melt">
        <div className="ml-wrap">
          <Reveal>
            <div className="ml-board">
              <div className="ml-board-top">
                <h2>今日 Gelato 口味</h2>
                <span>{updated ? `更新於 ${updated}` : "13:00 – 售完為止"}</span>
              </div>

              {board.entries.length === 0 ? (
                <p className="ml-board-empty">
                  今天的口味還沒貼上來。營業時間 13:00 開賣，直接來店裡看櫃就知道了。
                </p>
              ) : (
                <div className="ml-board-list">
                  {board.entries.map((e) =>
                    e.slug ? (
                      <Link key={e.key} href={`${ML}/flavors/${e.slug}`} className="ml-board-row">
                        <span className="ml-board-dot" style={{ background: e.color }} />
                        <span>
                          <span className="ml-board-name">{e.zh}</span>
                          {e.en && <span className="ml-board-en">{e.en}</span>}
                        </span>
                      </Link>
                    ) : (
                      <div key={e.key} className="ml-board-row">
                        <span className="ml-board-dot" style={{ background: e.color }} />
                        <span>
                          <span className="ml-board-name">{e.zh}</span>
                          <span className="ml-board-en">今日新登場</span>
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}

              <div className="ml-board-foot">
                <span>{board.note ?? "口味每天不同，售完就換下一支。"}</span>
                <OpenStatus />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 品牌簡介 ─────────────────────────────── */}
      <section className="ml-sec ml-sec--paper2">
        <div className="ml-wrap ml-split ml-split--wide">
          <Reveal>
            <p className="ml-eyebrow">About</p>
            <h2 className="ml-h2" style={{ marginTop: 14 }}>
              一位法式甜點主廚，
              <br />
              在大稻埕做冰。
            </h2>
            <div className="ml-prose" style={{ marginTop: 24 }}>
              <p>
                貴德街是老台北做茶葉生意的街。我們在這條街上開了一間冰店，
                用法式甜點的做法，處理台灣當季的果物。
              </p>
              <p>
                每一批都是當天現做，做多少賣多少。所以口味每天不太一樣——
                今天有荔枝，明天可能就換成龍眼；有些只做一季，有些只做一次。
              </p>
              <p>
                櫃子前面永遠可以試吃。不確定要哪一支，就先嚐嚐看再決定。
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
              <Link href={`${ML}/flavors`} className="ml-btn ml-btn--primary">
                看所有口味
              </Link>
              <Link href={`${ML}/store`} className="ml-btn ml-btn--ghost">
                店舖與交通
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="ml-stats">
              <div className="ml-stat">
                <b>{SITE.since}</b>
                <span>Since</span>
              </div>
              <div className="ml-stat">
                <b>{SITE.rating}</b>
                <span>Google 評分</span>
              </div>
              <div className="ml-stat">
                <b>{signature.length}+</b>
                <span>口味目錄</span>
              </div>
              <div className="ml-stat">
                <b>5</b>
                <span>每週營業日</span>
              </div>
            </div>

            <div className="ml-quote" style={{ marginTop: 18 }}>
              <p>「堅持每天現做冰淇淋的店家不多，給予支持。試吃給的很大方，每款的風味都會有所搭配。」</p>
              <cite>Google 評論・在地嚮導</cite>
            </div>
            <div className="ml-quote" style={{ marginTop: 12 }}>
              <p>「巷弄中的冰淇淋店，氣氛很好，店員熱情。」</p>
              <cite>Google 評論</cite>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 這陣子（新品／限定）─────────────────── */}
      <section className="ml-sec">
        <div className="ml-wrap">
          <Reveal>
            <div className="ml-head">
              <div className="ml-head-row">
                <div>
                  <p className="ml-eyebrow">New &amp; Limited</p>
                  <h2 className="ml-h2" style={{ marginTop: 12 }}>
                    這陣子的新東西
                  </h2>
                </div>
                <Link href={`${ML}/flavors`} className="ml-link">
                  全部口味
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
              <p className="ml-lede">
                限定口味有結束日期，過了就自己下架。想吃就別拖。
              </p>
            </div>
          </Reveal>

          <RevealStagger className="ml-grid">
            {highlights.map((f) => (
              <RevealItem key={f.slug}>
                <FlavorCard flavor={f} today={board.slugs.has(f.slug)} />
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* ── 招牌口味 ─────────────────────────────── */}
      <section className="ml-sec ml-sec--paper2">
        <div className="ml-wrap">
          <Reveal>
            <div className="ml-head">
              <div className="ml-head-row">
                <div>
                  <p className="ml-eyebrow">Signature</p>
                  <h2 className="ml-h2" style={{ marginTop: 12 }}>
                    常駐的那幾支
                  </h2>
                </div>
                <span className="ml-count">{signature.length} 款</span>
              </div>
              <p className="ml-lede">
                不一定每天都在櫃上，但只要看到就別錯過。當日供應以店內為準。
              </p>
            </div>
          </Reveal>

          <RevealStagger className="ml-grid">
            {signature.map((f) => (
              <RevealItem key={f.slug}>
                <FlavorCard flavor={f} today={board.slugs.has(f.slug)} compact />
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* ── 活動與合作 ───────────────────────────── */}
      <section className="ml-sec ml-sec--ink">
        <div className="ml-wrap">
          <Reveal>
            <div className="ml-head">
              <div className="ml-head-row">
                <div>
                  <p className="ml-eyebrow">Selected Works</p>
                  <h2 className="ml-h2" style={{ marginTop: 12, color: "var(--ml-paper)" }}>
                    我們去過的地方
                  </h2>
                </div>
                <Link href={`${ML}/events`} className="ml-link">
                  全部活動
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
              <p className="ml-lede">
                品牌聯名、市集擺攤、快閃、公司活動。冰淇淋櫃可以搬到需要它的地方。
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <WorksList events={events} />
          </Reveal>

          <Reveal delay={0.14}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 14,
                alignItems: "center",
                marginTop: 36,
              }}
            >
              <Link href={`${ML}/collab`} className="ml-btn ml-btn--yellow">
                提出合作邀請
              </Link>
              <span style={{ color: "#C9C0AD", fontSize: 14 }}>
                市集、聯名、企業活動、Private Event 都可以談。
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Instagram ────────────────────────────── */}
      <section className="ml-sec ml-sec--tight">
        <div className="ml-wrap">
          <Reveal>
            <div className="ml-head">
              <div className="ml-head-row">
                <div>
                  <p className="ml-eyebrow">Instagram</p>
                  <h2 className="ml-h2" style={{ marginTop: 12 }}>
                    每天的樣子都在這裡
                  </h2>
                </div>
                <a
                  className="ml-link"
                  href={SITE.instagram}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {SITE.instagramHandle}
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            {/* 目前用口味插畫撐版。店家提供實拍圖後，把每一格換成
                <Image>（圖片必須自架，伺服器 CSP 是 img-src 'self'）。 */}
            <div className="ml-social">
              {signature.slice(0, 6).map((f) => (
                <a
                  key={f.slug}
                  className="ml-social-tile"
                  style={{ background: f.color }}
                  href={SITE.instagram}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`在 Instagram 上看 ${f.nameZh}`}
                  data-scoop-color={f.color}
                >
                  <ScoopMark color={f.color} colorDeep={f.colorDeep} slug={f.slug} />
                </a>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 店舖資訊 ─────────────────────────────── */}
      <section className="ml-sec ml-sec--paper2">
        <div className="ml-wrap">
          <Reveal>
            <div className="ml-head">
              <p className="ml-eyebrow">Store</p>
              <h2 className="ml-h2">貴德街 59 號</h2>
              <p className="ml-lede">
                大稻埕碼頭旁的老街上，白色磁磚、黃色欄杆，看到黃色招牌就是了。
              </p>
            </div>
          </Reveal>

          <div className="ml-store">
            <Reveal>
              <OpenStatus />
              <div style={{ marginTop: 18 }}>
                <HoursTable />
              </div>
              <p className="ml-form-note" style={{ marginTop: 14 }}>
                {SITE.hoursNote}・{SITE.closedNote}
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
                <Link href={`${ML}/store`} className="ml-btn ml-btn--ghost">
                  交通方式
                </Link>
                <Link href={`${ML}/custom`} className="ml-btn ml-btn--ghost">
                  伴手禮・客製化蛋糕
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <StoreMap />
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
