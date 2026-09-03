import Link from "next/link";
import { RK, SITE } from "../_data/site";

export default function RkFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="rk-foot">
      <div className="rk-wrap">
        <div className="rk-foot__top">
          <div>
            <div className="rk-foot__mark">Rekat</div>
            <div className="rk-foot__zh">ROASTERY・{SITE.nameZh}</div>
            <p className="rk-foot__say">{SITE.tagline}</p>
          </div>

          <div>
            <h4>Beans</h4>
            <ul>
              <li>
                <Link href={`${RK}/beans`}>本期豆單</Link>
              </li>
              <li>
                <Link href={`${RK}/craft`}>風味輪與處理法</Link>
              </li>
              <li>
                <Link href={`${RK}/brewing`}>沖煮與保存</Link>
              </li>
              <li>
                <Link href={`${RK}/about`}>關於日卡地</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4>Contact</h4>
            <ul>
              <li>{SITE.addressFull}</li>
              <li>
                <a href={`tel:${SITE.phoneTel}`}>{SITE.phoneDisplay}</a>
              </li>
              <li>
                <a href={SITE.line} target="_blank" rel="noreferrer noopener">
                  加 LINE 好友
                </a>
              </li>
              <li>
                <a href={SITE.facebook} target="_blank" rel="noreferrer noopener">
                  Facebook
                </a>
              </li>
              <li>
                <Link href={`${RK}/order/lookup`}>訂單查詢</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="rk-foot__bot">
          <span>
            © {year} {SITE.name}・{SITE.nameZh}
          </span>
          <span>烘豆師 {SITE.roaster.name}・{SITE.region}</span>
        </div>
      </div>
    </footer>
  );
}
