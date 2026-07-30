import Link from "next/link";
import { SITE, WS } from "../_data/site";

export default function WsFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="ws-footer">
      <div className="ws-wrap ws-footer__in">
        <div>
          <div className="ws-footer__brand">{SITE.name}</div>
          <p className="ws-footer__meta">
            {SITE.tagline}・木料零售批發・代客裁切・施工場地・雙北免費配送
          </p>
        </div>
        <div className="ws-footer__meta">
          <div>{SITE.addressFull}</div>
          <div>
            電話：<a href={`tel:${SITE.phoneTel}`}>{SITE.phoneDisplay}</a>
          </div>
          <div>{SITE.hoursDisplay}</div>
          <div>
            <a href={SITE.mapsUrl} target="_blank" rel="noopener noreferrer">
              在 Google 地圖開啟 →
            </a>
          </div>
        </div>
        <div className="ws-footer__meta">
          <div>
            <Link href={`${WS}/products`}>木料目錄</Link>
          </div>
          <div>
            <Link href={`${WS}/quote`}>線上估價</Link>
          </div>
          <div>
            <Link href={`${WS}#facility`}>師傅設施</Link>
          </div>
          <div>
            <Link href={`${WS}#delivery`}>運送方式</Link>
          </div>
          <div>
            <Link href={`${WS}#faq`}>常見問題</Link>
          </div>
        </div>
        <div className="ws-footer__credit">
          <span>© {year} {SITE.name}｜本網站內容之品項與規格以現場報價為準</span>
          <a href="https://avalokite.xyz" target="_blank" rel="noopener noreferrer">
            網站設計製作：Avalo 阿瓦羅
          </a>
        </div>
      </div>
    </footer>
  );
}
