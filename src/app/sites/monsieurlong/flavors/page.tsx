import type { Metadata } from "next";
import FlavorBrowser from "../_components/FlavorBrowser";
import Reveal from "../_components/Reveal";
import OpenStatus from "../_components/OpenStatus";
import { getTodayBoard } from "../_data/board";
import { flagsOf, listFlavors } from "../_data/flavors";

export const revalidate = 60;

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
