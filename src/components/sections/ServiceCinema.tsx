"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import InkWash from "@/components/InkWash";

/**
 * 服務分鏡（Scroll Cinema）
 *
 * 左欄標題釘住不動，右欄三段服務依序捲過；捲到哪一段，左欄的步驟指示器
 * 就亮到哪一段，該段的流程節點也會依序點亮。
 *
 * 刻意把三段內容全部留在 DOM 的一般流裡（不是分頁切換），有兩個理由：
 * ① 爬蟲與 AI 搜尋讀得到完整的三段服務說明，不依賴 JS；
 * ② 捲動本身就是切換動作，不需要額外的狀態管理。
 */

interface FlowNode {
  icon: string;
  name: string;
  meta: string;
}

interface CinemaItem {
  num: string;
  name: string;
  headline: string;
  caption: string;
  cta: string;
  tags: string[];
  href: string;
  flow: FlowNode[];
}

/** 細線圖示組：一致的 24×24 網格、1.3 線寬，顏色交給 CSS 的 currentColor */
const ICONS: Record<string, React.ReactNode> = {
  design: <><rect x="2.5" y="4" width="19" height="14" /><path d="M2.5 8.5h19M8 21h8" /></>,
  code: <path d="M8.5 7 3 12l5.5 5M15.5 7l5.5 5-5.5 5" />,
  payment: <><rect x="2.5" y="5.5" width="19" height="13" rx="2" /><path d="M2.5 10.5h19M6 15h3.5" /></>,
  admin: <path d="M4 20V10.5M10 20V4M16 20v-7.5M22 20H2" />,
  deploy: <path d="M12 3v11.5M8 10.5l4 4 4-4M4 19.5h16" />,
  monitor: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5.2l3 1.8" /></>,
  chat: <path d="M21 15a2 2 0 0 1-2 2H7.5L3.5 21V5.5a2 2 0 0 1 2-2h13.5a2 2 0 0 1 2 2z" />,
  knowledge: <><rect x="3.5" y="3.5" width="17" height="17" /><path d="M7.5 8.5h9M7.5 12h9M7.5 15.5h5" /></>,
  ai: <><circle cx="12" cy="12" r="3.6" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1" /></>,
  person: <><circle cx="12" cy="7.5" r="3.8" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></>,
  log: <><rect x="3.5" y="3.5" width="17" height="17" /><path d="M7.5 9h9M7.5 13h5.5" /></>,
  report: <path d="M3 17l5.5-6.5 4 4L17 7l4 5" />,
  survey: <><path d="M7.5 3.5h9v4h-9z" /><path d="M5.5 5.5H3.5v15h17v-15h-2" /><path d="M8 12h8M8 16h5" /></>,
  blocks: <><rect x="3" y="3" width="7.5" height="7.5" /><rect x="13.5" y="3" width="7.5" height="7.5" /><rect x="3" y="13.5" width="7.5" height="7.5" /><path d="M13.5 17.5h7.5" /></>,
  link: <><path d="M10.5 13.5a4.5 4.5 0 0 0 6.4 0l2.7-2.7a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M13.5 10.5a4.5 4.5 0 0 0-6.4 0l-2.7 2.7a4.5 4.5 0 0 0 6.4 6.4l1-1" /></>,
  shield: <><path d="M12 2.8 4.5 6v6c0 4.4 3.1 7.8 7.5 9.2 4.4-1.4 7.5-4.8 7.5-9.2V6z" /><path d="M8.8 12.2l2.3 2.3 4.1-4.6" /></>,
  loop: <><path d="M4 12a8 8 0 0 1 13.7-5.6M20 12a8 8 0 0 1-13.7 5.6" /><path d="M17.5 2.5v4.2h-4.2M6.5 21.5v-4.2h4.2" /></>,
};

function NodeIcon({ name }: { name: string }) {
  return (
    <svg
      className="cinema-node-icon"
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name] ?? ICONS.blocks}
    </svg>
  );
}

export default function ServiceCinema() {
  const t = useTranslations("services");
  const items = t.raw("items") as CinemaItem[];
  const [active, setActive] = useState(0);
  const stages = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const els = stages.current.filter(Boolean) as HTMLElement[];
    if (els.length === 0 || typeof IntersectionObserver === "undefined") return;

    // 以視窗中段 10% 的橫帶當判定區：哪一段的主體落在帶上，哪一段就是現在這一幕
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const i = els.indexOf(entry.target as HTMLElement);
          if (i >= 0) setActive(i);
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items.length]);

  const goTo = useCallback((i: number) => {
    stages.current[i]?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });
  }, []);

  return (
    <section id="services" className="services-section cinema">
      <InkWash variant={4} />
      <div className="cinema-rail">
        <div className="mono-label">{t("label")}</div>
        <h2 className="section-title cinema-title">
          {t("title1")}
          <br />
          {t("title2")}
        </h2>
        <p className="cinema-intro">{t("intro")}</p>
        <ol className="cinema-steps">
          {items.map((item, i) => (
            <li key={item.num}>
              <button
                type="button"
                className={`cinema-step${i === active ? " is-active" : ""}`}
                onClick={() => goTo(i)}
                aria-current={i === active ? "true" : undefined}
              >
                <span className="cinema-step-num">{item.num}</span>
                <span className="cinema-step-name">{item.name}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="cinema-stages">
        {items.map((item, i) => (
          <article
            key={item.num}
            ref={(el) => {
              stages.current[i] = el;
            }}
            className={`cinema-stage${i === active ? " is-live" : ""}`}
          >
            <div className="cinema-stage-head">
              <span className="cinema-stage-num">{item.num}</span>
              <h3 className="cinema-stage-name">{item.name}</h3>
            </div>
            <p className="cinema-stage-headline">{item.headline}</p>

            <div className="cinema-flow">
              {item.flow.map((node, j) => (
                <div
                  className="cinema-node"
                  key={node.name}
                  style={{ transitionDelay: `${j * 0.08}s` }}
                >
                  <NodeIcon name={node.icon} />
                  <b className="cinema-node-name">{node.name}</b>
                  <span className="cinema-node-meta">{node.meta}</span>
                </div>
              ))}
            </div>

            <p className="cinema-caption">{item.caption}</p>

            <div className="cinema-foot">
              <div className="service-tags">
                {item.tags.map((tag) => (
                  <span className="tag" key={tag}>{tag}</span>
                ))}
              </div>
              <Link href={item.href} className="cinema-link">{item.cta}</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
