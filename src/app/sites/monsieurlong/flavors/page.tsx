import type { Metadata } from "next";
import FlavorBrowser from "../_components/FlavorBrowser";
import Reveal from "../_components/Reveal";
import OpenStatus from "../_components/OpenStatus";
import { getTodayBoard } from "../_data/board";
import { flagsOf, listFlavors } from "../_data/flavors";

// 今日供應板住在資料庫，而部署是「在本機 build 再把產物送上去」——
// 預先產生的話，HTML 裡包的會是開發機 dev.db 的看板，rsync 上去就成了初始快取，
// 店家改過的口味會在部署後短暫倒退回開發者電腦裡的那份（2026-08-31 實際踩到）。
// 這頁的重點就是「今天賣什麼」，寧可每次讀一下 SQLite 也不能給過期資料。
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "冰淇淋口味",
  description:
    "Monsieur Long 隆先生的 Gelato 口味目錄：荔枝、龍眼、開心果、鹽之花牛奶、經典巧克力等常駐款，以及每季更換的期間限定。每日供應款式以店內為準。",
  alternates: { canonical: "/flavors" },
};

export default async function FlavorsPage() {
  const [flavors, board] = await Promise.all([listFlavors(), getTodayBoard()]);

  const items = flavors.map((f) => ({
    ...f,
    flags: flagsOf(f),
    today: board.slugs.has(f.slug),
  }));

  return (
    <section className="ml-sec">
      <div className="ml-wrap">
        <Reveal>
          <div className="ml-head">
            <p className="ml-eyebrow">Flavors</p>
            <h1 className="ml-h2">
              今天想吃
              <br />
              哪一種心情？
            </h1>
            <p className="ml-lede">
              目錄裡是我們做過、也會再做的口味。每天實際出櫃的只有其中幾支，
              勾了「今日供應」的那幾款是店家早上剛更新的。
            </p>
            <div style={{ marginTop: 6 }}>
              <OpenStatus />
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.06}>
          <FlavorBrowser items={items} />
        </Reveal>

        <Reveal delay={0.1}>
          <p className="ml-form-note" style={{ marginTop: 40, maxWidth: "56ch" }}>
            成分與過敏原資訊請以店內標示為準，也歡迎直接詢問店員——
            櫃前一律可以試吃再決定。
          </p>
        </Reveal>
      </div>
    </section>
  );
}
