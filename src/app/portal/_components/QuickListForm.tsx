"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Chips } from "./Chips";
import { PhotoTile, hasPendingUploads, uploadedImageIds, type PhotoSlot } from "./PhotoTile";
import { CATEGORIES } from "@/app/sites/amber/_data/categories";
import {
  AXIS_PRESETS,
  VALUE_PRESETS,
  crossOptions,
  parseOptions,
} from "@/app/sites/amber/_data/spec-presets";
import { formatTaipei } from "@/lib/tw-time";

// 30 秒上架。
//
// 這個畫面的每一個決定都只服務一件事：她站在韓國的店裡、單手、4G，
// 手上還抱著八件商品。所以——
//
//   ・照片排第一，選完立刻開始壓縮與上傳，跟她打字並行。
//     這個重疊就是 30 秒預算的大半。
//   ・收單時間預設繼承檔期，顯示成一個她幾乎不用碰的唯讀晶片。
//     需求「每件商品可設收單時間」因此在常見情況下成本是零。
//   ・規格是一個文字框＋快捷鍵＋交叉產生器，不是九宮格矩陣。
//   ・送出後不換頁：清掉名稱與照片、其餘保留、焦點回到名稱欄。
//     她抱著八件東西時，這是每件 60 秒與 30 秒的差別。
//   ・草稿隨打隨存 localStorage。接電話、切背景、誤觸重整都不會丟。
//   ・冪等鍵讓「其實成功了但逾時」的重送不會變成兩件商品。

export type BatchInfo = {
  id: string;
  title: string;
  /** ISO 字串。null = 這個檔期沒設預設收單時間 */
  defaultDeadlineISO: string | null;
};

export type Prefill = {
  name?: string;
  price?: number;
  categoryKey?: string | null;
  optionAxis?: string | null;
  optionLabels?: string[];
  preorder?: boolean;
  showStock?: boolean;
};

type Draft = {
  name: string;
  price: string;
  axis: string;
  optionsText: string;
  categoryKey: string;
  deadlineLocal: string;
  preorder: boolean;
  showStock: boolean;
  stock: string;
  savedAt: number;
};

const DRAFT_KEY = "amber.draft.v1";
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const emptyDraft = (): Draft => ({
  name: "",
  price: "",
  axis: "",
  optionsText: "",
  categoryKey: "",
  deadlineLocal: "",
  preorder: false,
  showStock: false,
  stock: "",
  savedAt: 0,
});

export function QuickListForm({
  batch,
  prefill,
  recentAxes,
}: {
  batch: BatchInfo;
  prefill?: Prefill;
  recentAxes: string[];
}) {
  const [d, setD] = useState<Draft>(() => ({
    ...emptyDraft(),
    name: prefill?.name ?? "",
    price: prefill?.price != null ? String(prefill.price) : "",
    axis: prefill?.optionAxis ?? "",
    optionsText: (prefill?.optionLabels ?? []).join(","),
    categoryKey: prefill?.categoryKey ?? "",
    preorder: prefill?.preorder ?? false,
    showStock: prefill?.showStock ?? false,
  }));

  const [photos, setPhotos] = useState<PhotoSlot[]>([]);
  const [more, setMore] = useState(false);
  const [editDeadline, setEditDeadline] = useState(false);
  const [crossA, setCrossA] = useState("");
  const [crossB, setCrossB] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listed, setListed] = useState<{ id: string; name: string }[]>([]);
  const [restorable, setRestorable] = useState<Draft | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  /**
   * 冪等鍵。每次「開始填一件新商品」產生一次，送出成功後才換新的——
   * 逾時重送必須沿用同一個值，伺服器才認得出那是同一件。
   */
  const clientRef = useRef<string>(crypto.randomUUID());

  // ── 草稿：載入 ─────────────────────────────────────────
  const ready = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Draft;
        // 太舊的草稿不提示——她大概早就忘了那是什麼
        if (saved?.savedAt && Date.now() - saved.savedAt < DRAFT_MAX_AGE_MS && saved.name) {
          setRestorable(saved);
        }
      }
    } catch {
      /* localStorage 壞掉不該讓上架頁開不起來 */
    }
    // 讀完才允許寫回，否則第一次 render 會用空草稿蓋掉她上次存的
    ready.current = true;
  }, []);

  // ── 草稿：隨打隨存 ─────────────────────────────────────
  useEffect(() => {
    if (!ready.current) return;
    const t = setTimeout(() => {
      try {
        // 照片不存——它們已經上傳完、化簡成 id 了，而 File 也序列化不了
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, savedAt: Date.now() }));
      } catch {
        /* 無痕模式或空間滿了，忽略 */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [d]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const inheritedDeadline = batch.defaultDeadlineISO
    ? formatTaipei(new Date(batch.defaultDeadlineISO))
    : null;

  const options = parseOptions(d.optionsText);
  const pending = hasPendingUploads(photos);
  const canSubmit = d.name.trim().length > 0 && d.price.trim().length > 0 && !busy && !pending;

  const applyCross = useCallback(() => {
    const merged = crossOptions(parseOptions(crossA), parseOptions(crossB));
    if (merged.length > 0) set("optionsText", merged.join(","));
    setCrossA("");
    setCrossB("");
  }, [crossA, crossB]);

  const submit = useCallback(async () => {
    setError(null);
    setBusy(true);

    // 樂觀送出用的快照：失敗時要能原封不動還原
    const snapshot = { d, photos };

    const payload = {
      batchId: batch.id,
      name: d.name.trim(),
      price: Number(d.price.replace(/[^\d]/g, "")) || 0,
      categoryKey: d.categoryKey || null,
      optionAxis: d.axis || null,
      options: options.map((label) => ({ label })),
      imageIds: uploadedImageIds(photos),
      // 空字串 = 繼承檔期。字串是台北的牆上時間，伺服器負責換算——
      // 她人在首爾時，讓瀏覽器解析會差一小時。
      deadlineLocal: d.deadlineLocal || null,
      preorder: d.preorder,
      showStock: d.showStock,
      stock: d.showStock && d.stock ? Number(d.stock.replace(/[^\d]/g, "")) : null,
      status: "live" as const,
      clientRef: clientRef.current,
    };

    try {
      const res = await fetch("/api/portal/amber/product", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        // ⚠ 不要清空表單。丟掉一次 30 秒的上架比 401 本身糟糕得多。
        setError("登入已過期。請在另一個分頁重新登入後，回來再按一次上架。");
        return;
      }
      if (!res.ok) {
        setError("上架失敗，請再按一次。");
        return;
      }

      const out = (await res.json()) as { id: string; name: string };
      setListed((p) => [{ id: out.id, name: out.name }, ...p].slice(0, 12));

      // 連續上架模式：只清掉逐件不同的東西，其餘全部留著。
      // 分類、規格、收單時間、預購設定通常一整批都一樣。
      for (const s of photos) URL.revokeObjectURL(s.previewUrl);
      setPhotos([]);
      setD((p) => ({ ...p, name: "" }));
      clientRef.current = crypto.randomUUID();
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* 忽略 */
      }
      nameRef.current?.focus();
    } catch {
      setError("網路不穩，草稿已保留。有訊號時再按一次上架。");
      setD(snapshot.d);
      setPhotos(snapshot.photos);
    } finally {
      setBusy(false);
    }
  }, [batch.id, d, options, photos]);

  return (
    <div>
      {restorable && (
        <div className="p-note">
          有一份未送出的草稿「{restorable.name}」。
          <button
            type="button"
            className="p-btn-link"
            onClick={() => {
              setD(restorable);
              setRestorable(null);
            }}
          >
            回復
          </button>
          <button
            type="button"
            className="p-btn-link"
            onClick={() => {
              try {
                localStorage.removeItem(DRAFT_KEY);
              } catch {
                /* 忽略 */
              }
              setRestorable(null);
            }}
          >
            丟棄
          </button>
        </div>
      )}

      {/* 1. 照片——排第一，因為它是慢的那件事，必須跟打字重疊 */}
      <div className="p-dg-field">
        <label>照片</label>
        <PhotoTile slots={photos} onChange={setPhotos} disabled={busy} />
      </div>

      {/* 2. 商品名稱 */}
      <div className="p-dg-field">
        <label htmlFor="dg-name">商品名稱</label>
        <input
          id="dg-name"
          ref={nameRef}
          type="text"
          autoFocus
          enterKeyHint="next"
          value={d.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="例：韓國冰絲襪"
        />
      </div>

      {/* 3. 售價。刻意不用 type=number——iOS 會給帶小數點的鍵盤，
             而且 spinner 會劫持捲動。 */}
      <div className="p-dg-field">
        <label htmlFor="dg-price">售價（元）</label>
        <input
          id="dg-price"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="next"
          value={d.price}
          onChange={(e) => set("price", e.target.value.replace(/[^\d]/g, ""))}
          placeholder="250"
        />
      </div>

      {/* 4. 規格 */}
      <div className="p-dg-field">
        <label htmlFor="dg-options">規格（沒有就留空）</label>
        <Chips
          ariaLabel="規格類型"
          items={[...new Set([...recentAxes, ...AXIS_PRESETS])].map((a) => ({ key: a, label: a }))}
          selected={d.axis || null}
          onPick={(k) => set("axis", d.axis === k ? "" : k)}
        />
        <input
          id="dg-options"
          type="text"
          value={d.optionsText}
          onChange={(e) => set("optionsText", e.target.value)}
          placeholder="黑,白,灰"
        />
        <Chips
          ariaLabel="常用規格"
          items={VALUE_PRESETS.map((p) => ({ key: p.label, label: p.label }))}
          onPick={(k) => {
            const preset = VALUE_PRESETS.find((p) => p.label === k);
            if (preset) set("optionsText", preset.values.join(","));
          }}
        />

        {/* 交叉產生器：兩軸的效果，單軸的資料模型。
            「顏色 × 尺寸」在手機上填九宮格太慢，這裡兩次點擊就展開成扁平清單。 */}
        <details className="p-dg-cross">
          <summary>顏色 × 尺寸（兩組交叉）</summary>
          <div className="p-dg-crossrow">
            <input
              type="text"
              value={crossA}
              onChange={(e) => setCrossA(e.target.value)}
              placeholder="黑,白"
              aria-label="第一組"
            />
            <span aria-hidden>×</span>
            <input
              type="text"
              value={crossB}
              onChange={(e) => setCrossB(e.target.value)}
              placeholder="S,M,L"
              aria-label="第二組"
            />
            <button type="button" className="p-btn p-btn-ghost" onClick={applyCross}>
              產生
            </button>
          </div>
        </details>

        {options.length > 0 && (
          <p className="p-dg-hint">
            共 {options.length} 種：{options.join("、")}
          </p>
        )}
      </div>

      {/* 5. 收單時間——常見情況下她一次都不用碰 */}
      <div className="p-dg-field">
        <label>收單時間</label>
        {editDeadline ? (
          <input
            type="datetime-local"
            value={d.deadlineLocal}
            onChange={(e) => set("deadlineLocal", e.target.value)}
          />
        ) : (
          <div className="p-dg-inherit">
            <span>
              {inheritedDeadline ? `跟檔期一樣：${inheritedDeadline}` : "這一檔沒設收單時間"}
            </span>
            <button type="button" onClick={() => setEditDeadline(true)}>
              改
            </button>
          </div>
        )}
        {editDeadline && (
          <p className="p-dg-hint">
            填的是台北時間。留空則沿用檔期的設定。
            <button
              type="button"
              className="p-btn-link"
              onClick={() => {
                set("deadlineLocal", "");
                setEditDeadline(false);
              }}
            >
              改回跟檔期一樣
            </button>
          </p>
        )}
      </div>

      {/* 6. 分類 */}
      <div className="p-dg-field">
        <label>分類</label>
        <Chips
          ariaLabel="商品分類"
          items={CATEGORIES.map((c) => ({ key: c.key, label: c.name }))}
          selected={d.categoryKey || null}
          onPick={(k) => set("categoryKey", d.categoryKey === k ? "" : k)}
        />
      </div>

      {/* 7. 其餘設定收起來，90% 的路徑看不到 */}
      <details className="p-dg-more" open={more} onToggle={(e) => setMore(e.currentTarget.open)}>
        <summary>更多設定</summary>
        <label className="p-check">
          <input
            type="checkbox"
            checked={d.preorder}
            onChange={(e) => set("preorder", e.target.checked)}
          />
          允許預購（庫存 0 也能下單）
        </label>
        <label className="p-check">
          <input
            type="checkbox"
            checked={d.showStock}
            onChange={(e) => set("showStock", e.target.checked)}
          />
          前台顯示剩餘數量
        </label>
        {d.showStock && (
          <div className="p-dg-field">
            <label htmlFor="dg-stock">庫存數量</label>
            <input
              id="dg-stock"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={d.stock}
              onChange={(e) => set("stock", e.target.value.replace(/[^\d]/g, ""))}
              placeholder="不填 = 不限量"
            />
          </div>
        )}
      </details>

      {error && <p className="p-dg-error">{error}</p>}

      {listed.length > 0 && (
        <div className="p-note">
          本次已上架 {listed.length} 件：
          {listed.map((l) => (
            <span key={l.id}>
              {" "}
              <a href={`/portal/amber/products/${encodeURIComponent(l.id)}`}>{l.name}</a>
            </span>
          ))}
        </div>
      )}

      {/* 8. 置底動作列——她抱著八件商品，主要按鈕必須永遠在拇指下面 */}
      <div className="p-dg-sticky">
        <button type="button" className="p-btn" disabled={!canSubmit} onClick={() => void submit()}>
          {busy ? "上架中…" : pending ? "照片上傳中…" : "上架"}
        </button>
        <a className="p-btn p-btn-ghost" href={`/portal/amber/batches/${encodeURIComponent(batch.id)}`}>
          完成
        </a>
      </div>
    </div>
  );
}
