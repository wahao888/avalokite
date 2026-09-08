import type { Metadata } from "next";

import { SITE } from "../_data/site";
import { Features, HelpCta } from "../_components/Blocks";
import { AmberMark } from "../_components/Logo";
import {
  IconChat,
  IconChevronRight,
  IconHeart,
  IconShield,
  IconSparkle,
  IconStore,
} from "../_components/Icons";

export const metadata: Metadata = {
  title: `關於 ${SITE.name}`,
  description: "AmberPick 是各國品牌官網與門市的正品連線代購。這一頁說明我們怎麼工作，以及不做什麼。",
};

// 關於頁。
//
// ⚠ 這一頁**沒有一句虛構的經歷**：沒有成立年份、沒有服務人次、
// 沒有「深耕多年」。那些數字我們不知道，而客人查得到的謊言
// 比沒有介紹更傷。
//
// 寫得出來的只有兩種東西：
//   ① 客戶自己說過的話（出貨說明裡的服務範圍與承諾）
//   ② 這套系統實際做得到的事（合併結單、缺貨退款、公開的收單時間）
// 需要真實數字時，留給 Amber 自己補。

export default function AboutPage() {
  return (
    <div className="am-wrap am-wrap--narrow">
      <header className="am-pagehead">
        <p className="am-eyebrow">
          <IconSparkle size={14} stroke={2} />
          關於我們
        </p>
        <h1>{SITE.name}</h1>
        <p>{SITE.tagline}。人到當地，從品牌官網與門市把東西買回來。</p>
      </header>

      <div className="am-prose">
        <h2>
          <AmberMark size={19} stroke={1.8} />
          名字的由來
        </h2>
        <p>
          Amber 是琥珀——一顆被光穿過、把時間留在裡面的石頭。
          Pick 是「從一堆東西裡挑中的那一個」。
        </p>
        <p>
          標誌就是這兩件事：一顆線條乾淨的菱形寶石，中心一個實心的點。
          那個點就是<strong>被挑中的那一件</strong>。
        </p>

        <h2>
          <IconStore size={19} stroke={1.8} />
          我們怎麼工作
        </h2>
        <p>
          我們用「連線」的方式做代購。一檔連線就是一趟行程：
          出發前先開放下單、到收單時間截止，接著帶著大家的清單
          到當地的品牌官網或實體門市現場採買，買完統一寄回台灣。
        </p>
        <p>
          這種做法的好處是<strong>大家一起分攤運費</strong>，
          而且你買到的東西是有人真的站在那間店裡拿起來看過的。
        </p>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <Features />
      </div>

      <div className="am-prose" style={{ marginTop: "2.5rem" }}>
        <h2>
          <IconShield size={19} stroke={1.8} />
          我們不做什麼
        </h2>
        <ul>
          <li>
            <strong>不賣仿品。</strong>
            只從品牌官網與正規門市購買，不經第三方轉手，不從來路不明的通路調貨。
          </li>
          <li>
            <strong>不在結帳時加價。</strong>
            網站上的台幣售價已經是最終售價，不會再換算匯率或補收代購費。
            唯一另外計算的是運費，而運費同一檔只收一次。
          </li>
          <li>
            <strong>不用庫存冒充代購。</strong>
            採預購制——收到款項才安排採買，所以你付的錢是真的拿去買你要的那一件。
          </li>
          <li>
            <strong>不含糊帶過缺貨。</strong>
            現場買不到就是買不到，那一項會標示缺貨、從金額扣掉、把錢退給你，
            不會用別的東西替代。
          </li>
        </ul>

        <h2>
          <IconHeart size={19} stroke={1.8} />
          你會看到的東西
        </h2>
        <p>
          每一檔連線的<strong>收單時間都公開寫在商品上方</strong>，
          不是「隨時可能截止」。
          結單之後你會拿到一條專屬連結，上面有完整的金額拆解：
          商品金額、缺貨扣了多少、運費多少、已經收到多少、還差多少。
        </p>
        <p>
          代購最容易出事的地方是帳算不清楚。所以這個網站把帳攤開來給你看。
        </p>
      </div>

      <div className="am-btns" style={{ marginTop: "2rem" }}>
        <a className="am-btn am-btn--accent" href="/">
          看本檔商品
          <IconChevronRight size={16} stroke={2} />
        </a>
        <a className="am-btn am-btn--ghost" href="/how">
          購買流程
          <IconChevronRight size={16} stroke={2} />
        </a>
        {SITE.lineAddUrl && (
          <a className="am-btn am-btn--ghost" href={SITE.lineAddUrl}>
            <IconChat size={16} stroke={1.9} />
            LINE {SITE.lineId}
          </a>
        )}
      </div>

      <HelpCta />
    </div>
  );
}
