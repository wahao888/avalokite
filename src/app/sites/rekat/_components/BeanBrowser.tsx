"use client";

import { useMemo, useState } from "react";
import {
  listBeans,
  usedCountries,
  usedFamilies,
  usedProcesses,
  type Bean,
  type ProcessKey,
} from "../_data/beans";
import { FAMILY, type FamilyKey } from "../_data/flavor-wheel";
import BeanCard from "./BeanCard";

/* 豆單篩選。
 *
 * 十五支豆子當然可以一次列完，但這個站的主張是「我們懂咖啡」——
 * 讓人用「處理法」「風味調性」「產地」去切，本身就是在教一套挑豆的方法。
 * 篩選條件不寫回網址（避免每次點都產生一筆歷史紀錄），
 * 但接受從網址帶進來的初值：風味輪與處理法圖解上的連結就是靠這個運作的。
 */

type Price = "all" | "under500" | "mid" | "over1000";
type Sort = "no" | "asc" | "desc";

const PRICE_OPTS: { key: Price; label: string; test: (b: Bean) => boolean }[] = [
  { key: "all", label: "不限", test: () => true },
  { key: "under500", label: "500 以下", test: (b) => b.price <= 500 },
  { key: "mid", label: "500–1000", test: (b) => b.price > 500 && b.price <= 1000 },
  { key: "over1000", label: "1000 以上", test: (b) => b.price > 1000 },
];

const toggle = <T,>(arr: T[], v: T): T[] =>
  arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

export default function BeanBrowser({
  initialFamily,
  initialProcess,
  initialCountry,
}: {
  initialFamily?: FamilyKey;
  initialProcess?: ProcessKey;
  initialCountry?: string;
}) {
  const all = useMemo(() => listBeans(), []);
  const families = useMemo(() => usedFamilies(), []);
  const processes = useMemo(() => usedProcesses(), []);
  const countries = useMemo(() => usedCountries(), []);

  const [fam, setFam] = useState<FamilyKey[]>(initialFamily ? [initialFamily] : []);
  const [proc, setProc] = useState<ProcessKey[]>(initialProcess ? [initialProcess] : []);
  const [ctry, setCtry] = useState<string[]>(initialCountry ? [initialCountry] : []);
  const [price, setPrice] = useState<Price>("all");
  const [onlyBundle, setOnlyBundle] = useState(false);
  const [sort, setSort] = useState<Sort>("no");

  const bundleCount = useMemo(() => all.filter((b) => b.bundle).length, [all]);

  const shown = useMemo(() => {
    const p = PRICE_OPTS.find((o) => o.key === price)!;
    const out = all.filter(
      (b) =>
        (fam.length === 0 || b.families.some((f) => fam.includes(f))) &&
        (proc.length === 0 || proc.includes(b.process)) &&
        (ctry.length === 0 || ctry.includes(b.countryCode)) &&
        (!onlyBundle || Boolean(b.bundle)) &&
        p.test(b),
    );
    if (sort === "asc") out.sort((a, b) => a.price - b.price);
    else if (sort === "desc") out.sort((a, b) => b.price - a.price);
    return out;
  }, [all, fam, proc, ctry, price, onlyBundle, sort]);

  const dirty =
    fam.length > 0 || proc.length > 0 || ctry.length > 0 || price !== "all" || onlyBundle;

  const reset = () => {
    setFam([]);
    setProc([]);
    setCtry([]);
    setPrice("all");
    setOnlyBundle(false);
  };

  return (
    <>
      <div className="rk-filters">
        <div className="rk-filterrow">
          <span className="rk-eyebrow">風味調性</span>
          <div className="rk-chips">
            {families.map((f) => (
              <button
                key={f.key}
                type="button"
                className="rk-chip"
                aria-pressed={fam.includes(f.key)}
                onClick={() => setFam((v) => toggle(v, f.key))}
              >
                <span className="rk-chip__dot" style={{ ["--dot" as string]: FAMILY[f.key].color }} />
                {FAMILY[f.key].zh}
                <em>{f.count}</em>
              </button>
            ))}
          </div>
        </div>

        <div className="rk-filterrow">
          <span className="rk-eyebrow">處理法</span>
          <div className="rk-chips">
            {processes.map((p) => (
              <button
                key={p.key}
                type="button"
                className="rk-chip"
                aria-pressed={proc.includes(p.key)}
                onClick={() => setProc((v) => toggle(v, p.key))}
              >
                {p.labelZh}
              </button>
            ))}
          </div>
        </div>

        <div className="rk-filterrow">
          <span className="rk-eyebrow">產地</span>
          <div className="rk-chips">
            {countries.map((c) => (
              <button
                key={c.code}
                type="button"
                className="rk-chip"
                aria-pressed={ctry.includes(c.code)}
                onClick={() => setCtry((v) => toggle(v, c.code))}
              >
                {c.name}
                <em>{c.count}</em>
              </button>
            ))}
          </div>
        </div>

        <div className="rk-filterrow">
          <span className="rk-eyebrow">優惠</span>
          <div className="rk-chips">
            <button
              type="button"
              className="rk-chip"
              aria-pressed={onlyBundle}
              onClick={() => setOnlyBundle((v) => !v)}
            >
              只看三包優惠
              <em>{bundleCount}</em>
            </button>
          </div>
        </div>

        <div className="rk-filterrow">
          <span className="rk-eyebrow">價格</span>
          <div className="rk-chips">
            {PRICE_OPTS.map((o) => (
              <button
                key={o.key}
                type="button"
                className="rk-chip"
                aria-pressed={price === o.key}
                onClick={() => setPrice(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rk-filters__foot">
          <p className="rk-mute" style={{ fontSize: 13.5 }}>
            共 <b className="rk-num" style={{ color: "var(--rk-ink)" }}>{shown.length}</b> 支
            {dirty && (
              <button
                type="button"
                onClick={reset}
                style={{
                  border: 0,
                  background: "none",
                  color: "var(--rk-accent)",
                  cursor: "pointer",
                  marginLeft: 12,
                  fontSize: 13,
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                  fontFamily: "inherit",
                }}
              >
                清除條件
              </button>
            )}
          </p>

          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="rk-eyebrow">排序</span>
            <select
              className="rk-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              style={{ width: "auto", minHeight: 36, fontSize: 13.5, paddingBlock: 6 }}
            >
              <option value="no">豆單編號</option>
              <option value="asc">價格：低到高</option>
              <option value="desc">價格：高到低</option>
            </select>
          </label>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rk-empty">
          這幾個條件湊起來沒有豆子。
          <br />
          <button
            type="button"
            onClick={reset}
            style={{
              border: 0,
              background: "none",
              color: "var(--rk-accent)",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
              fontFamily: "inherit",
              fontSize: 14.5,
            }}
          >
            清除條件重新看
          </button>
        </p>
      ) : (
        <div className="rk-grid">
          {shown.map((b) => (
            <BeanCard key={b.slug} bean={b} />
          ))}
        </div>
      )}
    </>
  );
}
