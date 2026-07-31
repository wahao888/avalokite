import Link from "next/link";
import { SITE, WS } from "../_data/site";
import RingMark from "./RingMark";

export default function WsNav() {
  return (
    <header className="ws-nav">
      <div className="ws-wrap ws-nav__in">
        <Link href={WS} className="ws-nav__brand" aria-label="文山木材行 首頁">
          <span style={{ color: "var(--ws-wood)" }}>
            <RingMark className="ws-nav__mark" />
          </span>
          <span>
            <span className="ws-nav__name">{SITE.name}</span>
            <span className="ws-nav__sub">{SITE.tagline}</span>
          </span>
        </Link>
        <nav className="ws-nav__links" aria-label="主選單">
          <Link href={`${WS}/products`}>木料目錄</Link>
          <Link href={`${WS}#facility`}>師傅設施</Link>
          <Link href={`${WS}#delivery`}>運送方式</Link>
          <Link href={`${WS}#about`}>關於我們</Link>
          <Link href={`${WS}#faq`}>常見問題</Link>
        </nav>
        <a href={`tel:${SITE.phoneTel}`} className="ws-nav__phone">
          {SITE.phoneDisplay}
        </a>
        <Link href={`${WS}/quote`} className="ws-btn ws-btn--primary ws-nav__cta">
          線上估價
        </Link>
      </div>
    </header>
  );
}
