"use client";

import { useState, type ReactNode } from "react";

/**
 * 定價分頁切換
 *
 * 首頁原本一次攤開 7 個建置方案＋3 個月費＋12 項加購（22 個項目），
 * 是整頁最長的一段。改成三個分頁後一次只看一組，內容仍全部留在 DOM，
 * 不影響爬蟲與 AI 搜尋讀取。
 */

export interface PricingTab {
  id: string;
  label: string;
  panel: ReactNode;
}

export default function PricingTabs({ tabs }: { tabs: PricingTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  return (
    <div className="ptabs">
      <div className="ptabs-nav" role="tablist" aria-label="pricing">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`ptab-${tab.id}`}
            aria-controls={`ppanel-${tab.id}`}
            aria-selected={tab.id === active}
            className={`ptab${tab.id === active ? " is-active" : ""}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`ppanel-${tab.id}`}
          aria-labelledby={`ptab-${tab.id}`}
          className={`ptabs-panel${tab.id === active ? " is-active" : ""}`}
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
