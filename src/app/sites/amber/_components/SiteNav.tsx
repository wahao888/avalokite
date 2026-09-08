"use client";

import { usePathname } from "next/navigation";
import { SITE_NAV } from "../_data/nav";

// 桌機頁首的主導覽。手機版由 CSS 藏起來（.am-nav__site）——
// 從 LINE 點進來的人是來買的，那幾個「先了解再買」的頁面放頁尾就好。
//
// 需要 usePathname 才能標出目前所在頁，所以是 client component。
// 它只讀路徑、不持有 state，成本是幾百 bytes。

export function SiteNav() {
  const path = usePathname();

  return (
    <nav className="am-nav__site" aria-label="站台導覽">
      {SITE_NAV.map((l) => {
        // 首頁以外用前綴比對，這樣 /lineups/xxx 也會標亮「連線總覽」
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <a key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
            {l.label}
          </a>
        );
      })}
    </nav>
  );
}
