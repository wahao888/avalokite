import type { Metadata } from "next";
import { listBeans, priceRange, PROCESS, UNIT_LABEL, type ProcessKey } from "../_data/beans";
import type { FamilyKey } from "../_data/flavor-wheel";
import { FAMILY } from "../_data/flavor-wheel";
import { BUNDLE_NOTE, LIST_NOTE, SITE } from "../_data/site";
import { twd } from "../_data/shop";
import { getStock, stockProps, visibleBeans } from "../_data/stock";
import BeanBrowser from "../_components/BeanBrowser";
import Reveal from "../_components/Reveal";

export const metadata: Metadata = {
  title: "本期豆單",
  description:
    "REKAT ROASTERY 本期咖啡豆一覽：衣索比亞藝伎村、巴拿馬翡翠莊園、牙買加藍山、哥倫比亞厭氧發酵等 15 支精品生豆，全品項淺焙到中焙，半磅裝原豆。",
  alternates: { canonical: "/beans" },
};

// 供應狀態住在資料庫，而部署是「在本機 build 再把產物送上去」——
// 預先產生的話，HTML 裡會包住開發機的狀態（見 _data/stock.ts 的說明）。
export const dynamic = "force-dynamic";

export default async function BeansPage({
  searchParams,
}: {
  searchParams: Promise<{ family?: string; process?: string; country?: string }>;
}) {
  const sp = await searchParams;
  const stock = await getStock();
  const beans = visibleBeans(stock);
  const [lo, hi] = priceRange();

  // 從網址帶進來的初值（風味輪、處理法圖解、地圖上的連結會帶）。
  // 一律驗證過才用——網址是使用者可控輸入，塞進 state 之前先確認它真的存在。
  const family = sp.family && sp.family in FAMILY ? (sp.family as FamilyKey) : undefined;
  const process = sp.process && sp.process in PROCESS ? (sp.process as ProcessKey) : undefined;
  const country =
    sp.country && beans.some((b) => b.countryCode === sp.country) ? sp.country : undefined;

  return (
    <div className="rk-wrap">
      <section style={{ paddingBlock: "clamp(40px, 6vw, 76px) 8px" }}>
        <Reveal>
          <span className="rk-eyebrow">Bean List・{SITE.listVersion}</span>
          <h1 className="rk-h1" style={{ marginTop: 12 }}>
            本期豆單
          </h1>
          <p className="rk-lede" style={{ marginTop: 18 }}>
            {beans.length} 支，全部單一產區，淺焙到中焙。半磅（227g）裝，
            {twd(lo)} 到 {twd(hi)}。下單後才烘，一律出原豆。
          </p>
        </Reveal>
      </section>

      {stock.note && (
        <p className="rk-alert" style={{ marginBottom: 4 }}>
          {stock.note}
        </p>
      )}

      <hr className="rk-rule" />

      <BeanBrowser
        initialFamily={family}
        initialProcess={process}
        initialCountry={country}
        {...stockProps(stock)}
      />

      <p className="rk-caveat" style={{ marginTop: 34, marginBottom: 20 }}>
        {BUNDLE_NOTE}
        <br />
        {LIST_NOTE}　單位：{UNIT_LABEL}。
      </p>
    </div>
  );
}
