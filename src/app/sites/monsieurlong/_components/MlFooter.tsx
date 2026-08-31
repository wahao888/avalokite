import Link from "next/link";
import { ML, SITE } from "../_data/site";

export default function MlFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="ml-foot">
      <div className="ml-wrap">
        <div className="ml-foot-top">
          <div>
            <p className="ml-foot-word">
              Your Mood
              <br />
              Your Scoop
            </p>
            <p style={{ marginTop: 18, color: "#C9C0AD", maxWidth: "28ch", lineHeight: 1.9 }}>
              {SITE.intro}
            </p>
          </div>

          <div>
            <h4>店舖</h4>
            <ul>
              <li>{SITE.addressFull}</li>
              <li>週日・一・四・五・六 13:00–19:00</li>
              <li>{SITE.closedNote}</li>
              <li style={{ marginTop: 10 }}>
                <a href={SITE.directionsUrl} target="_blank" rel="noreferrer noopener">
                  Google 導航 ↗
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4>網站</h4>
            <ul>
              <li>
                <Link href={`${ML}/flavors`}>口味</Link>
              </li>
              <li>
                <Link href={`${ML}/events`}>活動與合作</Link>
              </li>
              <li>
                <Link href={`${ML}/collab`}>合作邀請</Link>
              </li>
              <li>
                <Link href={`${ML}/custom`}>伴手禮・客製化蛋糕</Link>
              </li>
              <li>
                <Link href={`${ML}/store`}>店舖資訊</Link>
              </li>
            </ul>
            <h4 style={{ marginTop: 22 }}>社群</h4>
            <ul>
              <li>
                <a href={SITE.instagram} target="_blank" rel="noreferrer noopener">
                  Instagram {SITE.instagramHandle} ↗
                </a>
              </li>
              <li>
                <a href={SITE.threads} target="_blank" rel="noreferrer noopener">
                  Threads ↗
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="ml-foot-bottom">
          <span>
            © {year} {SITE.name}
          </span>
          <span>Since {SITE.since}・大稻埕 貴德街</span>
          <span>
            Website by{" "}
            <a href="https://avalokite.xyz" target="_blank" rel="noreferrer noopener">
              Avalo
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
