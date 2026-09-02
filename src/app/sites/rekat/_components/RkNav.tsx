"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RK, SITE } from "../_data/site";
import CartButton from "./CartButton";

const LINKS = [
  { href: `${RK}/beans`, label: "豆單" },
  { href: `${RK}/craft`, label: "咖啡知識" },
  { href: `${RK}/brewing`, label: "沖煮指南" },
  { href: `${RK}/about`, label: "關於日卡地" },
];

export default function RkNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // 換頁後把手機選單收起來
  useEffect(() => setOpen(false), [path]);

  // proxy 改寫後，usePathname 在客戶端拿到的是外部路徑（/beans），
  // 但 SSR 時是改寫後的內部路徑（/sites/rekat/beans）——兩邊都要能對得上。
  const isOn = (href: string) => path === href || path.endsWith(href);

  return (
    <header className="rk-nav">
      <div className="rk-nav__in">
        <Link className="rk-logo" href={`${RK}/`} aria-label={`${SITE.name} 首頁`}>
          <b>Rekat</b>
          <span>ROASTERY・日卡地自然農莊</span>
        </Link>

        <nav className="rk-nav__links" aria-label="主選單">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isOn(l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>

        <CartButton />

        <button
          className="rk-burger"
          type="button"
          aria-expanded={open}
          aria-controls="rk-mobnav"
          aria-label="開啟選單"
          onClick={() => setOpen((v) => !v)}
        >
          <i />
          <i />
          <i />
        </button>
      </div>

      {open && (
        <nav className="rk-mobnav" id="rk-mobnav" aria-label="主選單">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
