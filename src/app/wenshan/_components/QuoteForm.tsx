"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CATALOG, findItem } from "../_data/catalog";
import { VENUES, findVenue } from "../_data/venues";
import { estimateFreight, ALL_REGIONS } from "../_data/freight";
import { SITE, WS } from "../_data/site";
import { useQuoteList } from "./QuoteListProvider";

const PROJECT_TYPES = [
  "裝潢隔間",
  "天花板",
  "木作櫃體",
  "地板下地",
  "結構模板",
  "戶外平台／圍籬",
  "家具製作",
  "其他（備註說明）",
];

interface PickedItem {
  id: string;
  name: string;
  qty: string;
}

export default function QuoteForm({ initialVenue }: { initialVenue?: string }) {
  const quoteList = useQuoteList();
  const [venue, setVenue] = useState<string | null>(
    findVenue(initialVenue)?.id ?? null,
  );
  const [projectType, setProjectType] = useState("");
  const [picked, setPicked] = useState<PickedItem[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [note, setNote] = useState("");
  const [region, setRegion] = useState("台北市");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState("");

  // 自動合併詢價清單已選品項。
  // Provider 從 localStorage 載入是非同步的，故監聽 items 變化做冪等合併，
  // 而非只在 mount 跑一次（mount 時清單可能還是空的）。
  useEffect(() => {
    if (quoteList.items.length === 0) return;
    setPicked((prev) => {
      const missing = quoteList.items.filter((it) => !prev.some((m) => m.id === it.id));
      if (missing.length === 0) return prev;
      return [...prev, ...missing.map((it) => ({ id: it.id, name: it.name, qty: it.qty ?? "" }))];
    });
  }, [quoteList.items]);

  const venueDef = findVenue(venue);

  // 顯示的品項：場域建議 + 已勾選 +（展開時）全部
  const visibleItems = useMemo(() => {
    const ids = new Set<string>();
    if (venueDef) venueDef.suggestedItemIds.forEach((id) => ids.add(id));
    picked.forEach((p) => ids.add(p.id));
    if (showAll) {
      CATALOG.forEach((c) => c.items.forEach((i) => ids.add(i.id)));
    }
    return Array.from(ids)
      .map((id) => findItem(id))
      .filter((f): f is NonNullable<typeof f> => f !== null);
  }, [venueDef, picked, showAll]);

  const toggleItem = (id: string, itemName: string) => {
    setPicked((prev) => {
      if (prev.some((p) => p.id === id)) {
        // 取消勾選時同步從詢價清單移除，避免下次進頁又被合併回來
        quoteList.remove(id);
        return prev.filter((p) => p.id !== id);
      }
      return [...prev, { id, name: itemName, qty: "" }];
    });
  };

  const setQty = (id: string, qty: string) => {
    setPicked((prev) => prev.map((p) => (p.id === id ? { ...p, qty } : p)));
  };

  const freight = estimateFreight(region);
  const today = new Date().toISOString().slice(0, 10);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg("");
    if (!name.trim() || !phone.trim()) {
      setErrMsg("請填寫姓名與電話，方便我們回覆報價。");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/api/wenshan/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue: venueDef?.name ?? "",
          projectType,
          items: picked.map((p) => ({ name: p.name, qty: p.qty })),
          note,
          region,
          address,
          date,
          name,
          phone,
          lineId,
          email,
          website: hp,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("ok");
      quoteList.clear();
    } catch {
      setStatus("err");
      setErrMsg("送出失敗，請稍後再試，或直接來電。");
    }
  };

  if (status === "ok") {
    return (
      <div className="ws-success">
        <h2>估價需求已收到</h2>
        <p>
          我們會在營業時間內（週二至週六 07:00–17:00）盡快回覆報價。
          <br />
          急件歡迎直接來電，黃老闆現場為你服務。
        </p>
        <a href={`tel:${SITE.phoneTel}`} className="ws-btn ws-btn--primary">
          ☎ {SITE.phoneDisplay}
        </a>
      </div>
    );
  }

  return (
    <form className="ws-form" onSubmit={submit} noValidate>
      {/* Honeypot：一般使用者看不到 */}
      <div className="ws-hp" aria-hidden="true">
        <label>
          請勿填寫
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
          />
        </label>
      </div>

      <fieldset className="ws-fieldset">
        <legend>
          <span className="ws-stepnum">STEP 01</span>你的工程
        </legend>
        <div className="ws-field">
          <label>工程場域</label>
          <div className="ws-chips" role="group" aria-label="選擇工程場域">
            {VENUES.map((v) => (
              <button
                key={v.id}
                type="button"
                className="ws-chip"
                aria-pressed={venue === v.id}
                onClick={() => setVenue(venue === v.id ? null : v.id)}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
        <div className="ws-field">
          <label htmlFor="ws-ptype">工程類型</label>
          <select
            id="ws-ptype"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
          >
            <option value="">請選擇（選填）</option>
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset className="ws-fieldset">
        <legend>
          <span className="ws-stepnum">STEP 02</span>需要的料
        </legend>
        {venueDef && (
          <p className="ws-form__suggest-note">
            已依「{venueDef.name}」帶出常用料，勾選後可填規格數量；不確定的交給備註就好。
          </p>
        )}
        {visibleItems.length > 0 && (
          <div className="ws-check-grid">
            {visibleItems.map(({ item }) => {
              const isOn = picked.some((p) => p.id === item.id);
              const p = picked.find((pp) => pp.id === item.id);
              return (
                <div key={item.id} className={`ws-checkitem${isOn ? " ws-checkitem--on" : ""}`}>
                  <label>
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => toggleItem(item.id, item.name)}
                    />
                    <span>
                      {item.name}
                      <span className="ws-checkitem__specs">{item.specs.join("・")}</span>
                    </span>
                  </label>
                  {isOn && (
                    <div className="ws-checkitem__qty">
                      <input
                        type="text"
                        placeholder={`規格／數量（例：1.2寸×1寸×8尺 × 50${item.unit}）`}
                        value={p?.qty ?? ""}
                        onChange={(e) => setQty(item.id, e.target.value)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {!showAll && (
          <div style={{ marginTop: 16 }}>
            <button type="button" className="ws-btn ws-btn--ghost" onClick={() => setShowAll(true)}>
              {visibleItems.length > 0 ? "顯示全部品項" : "選擇品項"}
            </button>
          </div>
        )}
        <div className="ws-field">
          <label htmlFor="ws-note">其他需求或尺寸備註</label>
          <textarea
            id="ws-note"
            placeholder="直接貼料單也可以。例：柳安角材 1.2×1×8尺 100支、6分木心板 20片，需代客裁切。"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="ws-fieldset">
        <legend>
          <span className="ws-stepnum">STEP 03</span>配送與聯絡
        </legend>
        <div className="ws-field-row">
          <div className="ws-field">
            <label htmlFor="ws-region">配送區域</label>
            <select id="ws-region" value={region} onChange={(e) => setRegion(e.target.value)}>
              {ALL_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="現場自取">現場自取（北投立功街）</option>
            </select>
            {region === "現場自取" ? (
              <p className="ws-form__freight-note ws-form__freight-note--free">
                歡迎來店自取，順便讓黃老闆幫你看料。
              </p>
            ) : freight?.fee === 0 ? (
              <p className="ws-form__freight-note ws-form__freight-note--free">
                ✓ 雙北工地免費配送
              </p>
            ) : freight?.fee != null ? (
              <p className="ws-form__freight-note ws-form__freight-note--paid">
                此區域運費 NT${freight.fee.toLocaleString()}／趟起，報價時一併確認
              </p>
            ) : (
              <p className="ws-form__freight-note ws-form__freight-note--paid">
                此區域採專案報價，我們會在回覆中一併估算運費
              </p>
            )}
          </div>
          <div className="ws-field">
            <label htmlFor="ws-addr">工地／收貨地址（選填）</label>
            <input
              id="ws-addr"
              type="text"
              placeholder="方便的話先留，估運更準"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>
        <div className="ws-field-row">
          <div className="ws-field">
            <label htmlFor="ws-date">期望到貨日（選填）</label>
            <input
              id="ws-date"
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <p className="ws-tool__hint">週日、週一公休，出車為週二至週六。</p>
          </div>
          <div className="ws-field">
            <label htmlFor="ws-name">
              姓名／稱呼 <span className="ws-req">＊</span>
            </label>
            <input
              id="ws-name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <div className="ws-field-row">
          <div className="ws-field">
            <label htmlFor="ws-phone">
              聯絡電話 <span className="ws-req">＊</span>
            </label>
            <input
              id="ws-phone"
              type="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="ws-field">
            <label htmlFor="ws-line">LINE ID（選填）</label>
            <input
              id="ws-line"
              type="text"
              value={lineId}
              onChange={(e) => setLineId(e.target.value)}
            />
          </div>
        </div>
        <div className="ws-field">
          <label htmlFor="ws-email">Email（選填）</label>
          <input
            id="ws-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </fieldset>

      <div className="ws-form__actions">
        <button type="submit" className="ws-btn ws-btn--primary" disabled={status === "submitting"}>
          {status === "submitting" && (
            <svg className="ws-ringspin" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="10" r="6.5" />
            </svg>
          )}
          {status === "submitting" ? "送出中…" : "送出估價需求"}
        </button>
        {errMsg && <span className="ws-form__error">{errMsg}</span>}
      </div>
      <p className="ws-tool__hint">
        送出後不會有任何費用，我們會以電話或 LINE 回覆報價。也歡迎直接來電{" "}
        <a href={`tel:${SITE.phoneTel}`} style={{ textDecoration: "underline" }}>
          {SITE.phoneDisplay}
        </a>
        ，或先逛逛
        <Link href={`${WS}/products`} style={{ textDecoration: "underline" }}>
          木料目錄
        </Link>
        。
      </p>
    </form>
  );
}
