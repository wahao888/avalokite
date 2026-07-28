import type { Metadata } from "next";
import Link from "next/link";
import { CATALOG } from "../_data/catalog";
import { WS, SITE } from "../_data/site";
import AddItemButton from "../_components/AddItemButton";
import VenueFlag from "../_components/VenueFlag";
import CaiCalculator from "../_components/CaiCalculator";
import GrainDivider from "../_components/GrainDivider";

export const metadata: Metadata = {
  title: "木料目錄",
  description:
    "文山木材行木料目錄：角材、夾板、木心板、OSB、實木拼板、南方松、線板與裁切加工。常備現貨、規格齊全，北投關渡倉庫供應雙北。",
};

const STOCK_CLASS: Record<string, string> = {
  常備現貨: "ws-stock--in",
  依現貨: "ws-stock--dep",
  可調貨: "ws-stock--ord",
};

export default function ProductsPage() {
  return (
    <main>
      <div className="ws-wrap ws-page-head">
        <p className="ws-eyebrow">Catalog</p>
        <h1 className="ws-h2">木料目錄</h1>
        <p className="ws-lede">
          十二大類常備品項與常見規格。看到需要的按「＋加入詢價單」，逛完一次送出；
          目錄外的特殊料，來電 {SITE.phoneDisplay} 問一聲，通常都調得到。
        </p>
      </div>

      {/* 分類快捷 */}
      <nav className="ws-products-nav" aria-label="分類快捷">
        <div className="ws-wrap ws-products-nav__in">
          {CATALOG.map((cat) => (
            <a key={cat.id} href={`#${cat.id}`}>
              {cat.name}
            </a>
          ))}
        </div>
      </nav>

      <div className="ws-wrap">
        {CATALOG.map((cat, idx) => (
          <section key={cat.id} id={cat.id} className="ws-prodcat">
            <div className="ws-prodcat__head">
              <h2>{cat.name}</h2>
              <VenueFlag categoryId={cat.id} />
            </div>
            <p className="ws-prodcat__blurb">{cat.blurb}</p>
            <div className="ws-tablewrap">
              <table className="ws-table">
                <thead>
                  <tr>
                    <th>品項</th>
                    <th>常見規格</th>
                    <th>單位</th>
                    <th>供應</th>
                    <th aria-label="加入詢價單" />
                  </tr>
                </thead>
                <tbody>
                  {cat.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.name}
                        {item.note && (
                          <div style={{ fontSize: 12.5, color: "var(--ws-muted)" }}>{item.note}</div>
                        )}
                      </td>
                      <td style={{ fontFamily: "var(--ws-mono)", fontSize: 13.5 }}>
                        {item.specs.join("・")}
                      </td>
                      <td>{item.unit}</td>
                      <td>
                        <span className={`ws-stock ${STOCK_CLASS[item.stock]}`}>{item.stock}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <AddItemButton id={item.id} name={item.name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {idx === 4 && (
              <div style={{ marginTop: 34 }}>
                <GrainDivider flip />
              </div>
            )}
          </section>
        ))}

        {/* 單位說明＋才數計算機 */}
        <section className="ws-prodcat" id="units">
          <div className="ws-prodcat__head">
            <h2>看懂木材行的單位</h2>
          </div>
          <ul className="ws-ul" style={{ marginTop: 14, maxWidth: 640 }}>
            <li>
              <strong>分</strong>：厚度單位，1分約 3mm。「6分板」就是約 18mm 厚。
            </li>
            <li>
              <strong>寸／尺</strong>：1寸＝3.03cm，1尺＝10寸＝30.3cm。「4×8尺」大板約 122×244cm。
            </li>
            <li>
              <strong>才</strong>：材積計價單位。角材 1才＝1寸×1寸×10尺；板料 1才＝1尺×1尺。
            </li>
          </ul>
          <CaiCalculator />
        </section>

        <section className="ws-section">
          <div className="ws-cta-band ws-reveal">
            <h2>選好了？讓我們接手</h2>
            <p>把詢價單送出來，黃老闆幫你確認規格、抓數量、報價格。</p>
            <Link href={`${WS}/quote`} className="ws-btn ws-btn--primary">
              前往線上估價
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
