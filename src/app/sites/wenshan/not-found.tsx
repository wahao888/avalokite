import Link from "next/link";
import { WS } from "./_data/site";

export default function WenshanNotFound() {
  return (
    <main className="ws-notfound">
      <h1>這塊料找不到了</h1>
      <p>頁面不存在或已搬走。回到首頁，或直接看看木料目錄。</p>
      <Link href={WS} className="ws-btn ws-btn--primary">
        回文山木材行首頁
      </Link>
    </main>
  );
}
