import type { Metadata } from "next";
import Link from "next/link";
import StoreMap from "../_components/StoreMap";
import OpenStatus, { HoursTable } from "../_components/OpenStatus";
import Reveal from "../_components/Reveal";
import { ML, SITE } from "../_data/site";

export const metadata: Metadata = {
  title: "店舖資訊與交通",
  description:
    "Monsieur Long 隆先生：103 台北市大同區貴德街 59 號，鄰近大稻埕碼頭與迪化街。週日一四五六 13:00–19:00 營業，週二、三公休。捷運、公車與停車資訊，一鍵開啟 Google 導航。",
  alternates: { canonical: "/store" },
};

export default function StorePage() {
  return (
    <>
      <section className="ml-sec ml-sec--tight">
        <div className="ml-wrap">
          <Reveal>
            <div className="ml-head">
              <p className="ml-eyebrow">Store</p>
              <h1 className="ml-h2">
                大稻埕・貴德街 59 號
              </h1>
              <p className="ml-lede">
                做茶葉生意的老街上，白色磁磚外牆、黃色鐵欄杆與黃色招牌。
                外帶窗口就在騎樓下。
              </p>
              <div style={{ marginTop: 6 }}>
                <OpenStatus />
              </div>
            </div>
          </Reveal>

          <div className="ml-store">
            <Reveal>
              <dl className="ml-facts">
                <div className="ml-fact">
                  <dt>地址</dt>
                  <dd>{SITE.addressFull}</dd>
                </div>
                <div className="ml-fact">
                  <dt>營業</dt>
                  <dd>
                    {SITE.hoursNote}
                    <br />
                    {SITE.closedNote}
                  </dd>
                </div>
                {SITE.phoneDisplay && (
                  <div className="ml-fact">
                    <dt>電話</dt>
                    <dd>
                      <a href={`tel:${SITE.phoneTel}`}>{SITE.phoneDisplay}</a>
                    </dd>
                  </div>
                )}
                <div className="ml-fact">
                  <dt>聯絡</dt>
                  <dd>
                    <a href={SITE.instagram} target="_blank" rel="noreferrer noopener">
                      Instagram {SITE.instagramHandle} ↗
                    </a>
                    <br />
                    <a href={SITE.threads} target="_blank" rel="noreferrer noopener">
                      Threads ↗
                    </a>
                  </dd>
                </div>
                <div className="ml-fact">
                  <dt>內用</dt>
                  <dd>以外帶為主，門口有座位可以坐著吃完再走。</dd>
                </div>
              </dl>

              <div style={{ marginTop: 22 }}>
                <HoursTable />
              </div>

              <h3 className="ml-h3" style={{ marginTop: 34 }}>
                怎麼過來
              </h3>
              <ul className="ml-transit">
                {SITE.transit.map((t) => (
                  <li key={t.line}>
                    <b>{t.line}</b>
                    <span>{t.text}</span>
                  </li>
                ))}
              </ul>
              <p className="ml-form-note" style={{ marginTop: 14 }}>
                交通說明為概略指引，實際路線請以 Google 導航為準。
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <StoreMap />

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
                <a
                  className="ml-btn ml-btn--primary"
                  href={SITE.mapsUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  在 Google 地圖上看
                </a>
                <Link href={`${ML}/flavors`} className="ml-btn ml-btn--ghost">
                  先看今天有什麼
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
