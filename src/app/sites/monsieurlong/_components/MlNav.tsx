"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ML, SITE } from "../_data/site";

export const NAV = [
  { href: `${ML}/flavors`, zh: "口味", en: "Flavors" },
  { href: `${ML}/events`, zh: "活動與合作", en: "Events" },
  { href: `${ML}/store`, zh: "店舖", en: "Store" },
  { href: `${ML}/custom`, zh: "伴手禮・蛋糕", en: "Gifts" },
];

export default function MlNav() {
  const pathname = usePathname();
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 換頁就收起抽屜（Link 導航不會卸載 nav，狀態會留著）
  useEffect(() => setOpen(false), [pathname]);

  // 抽屜開著時鎖住背景捲動，否則 iOS 會在遮罩下面繼續滑
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 內部路徑判定：/flavors/lychee 也要讓「口味」亮起來
  const isCurrent = (href: string) =>
    href === `${ML}/` ? pathname === href : pathname.startsWith(href);

  return (
    <>
      <header className="ml-nav" data-stuck={stuck}>
        <div className="ml-wrap ml-nav-in">
          <Link href={`${ML}/`} className="ml-logo" aria-label={`${SITE.name} 首頁`}>
            {/* 店家提供的標準組合，去背後的 PNG（見 scripts/monsieurlong-logo.mjs）。
                本專案不用 next/image，維持與其他站一致的 <img>；
                寫死 width/height 讓瀏覽器先保留位置，載入時不會跳版。 */}
            <img
              className="ml-logo-img"
              src="/sites/monsieurlong/logo.png"
              alt={SITE.name}
              width={863}
              height={348}
            />
            <span className="ml-logo-sub">隆先生・大稻埕</span>
          </Link>

          <nav className="ml-nav-links" aria-label="主要導覽">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={isCurrent(n.href) ? "page" : undefined}>
                {n.zh}
              </Link>
            ))}
          </nav>

          <div className="ml-nav-cta">
            <Link href={`${ML}/collab`} className="ml-btn ml-btn--primary">
              合作邀請
            </Link>
          </div>

          <button
            type="button"
            className="ml-burger"
            aria-expanded={open}
            aria-controls="ml-drawer"
            aria-label={open ? "關閉選單" : "開啟選單"}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <m.div
            id="ml-drawer"
            className="ml-drawer"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {[{ href: `${ML}/`, zh: "首頁", en: "Home" }, ...NAV].map((n, i) => (
              <m.span
                key={n.href}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link href={n.href}>
                  {n.zh}
                  <small>{n.en}</small>
                </Link>
              </m.span>
            ))}
            <div className="ml-drawer-foot">
              <Link href={`${ML}/collab`} className="ml-btn ml-btn--yellow">
                合作邀請
              </Link>
              <a
                className="ml-btn ml-btn--ghost"
                href={SITE.directionsUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                前往店舖
              </a>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
