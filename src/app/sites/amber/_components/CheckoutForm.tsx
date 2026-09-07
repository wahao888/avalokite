"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";
import { twd } from "../_data/cart";
import { CVS_BRANDS, SHIP_KIND_ZH, SITE, type ShipKind } from "../_data/site";
import { ShareLine, ShareCopy } from "./ShareLine";
import { rememberMyLink } from "./MyOrdersLink";
import { keepForMeText } from "@/lib/line-share";

// 結帳。
//
// 需求第 11 項：「客人連線期間看到喜歡的商品可以一直加入購物車，
// 不需要每一樣商品都重新填資料」。第一期的做法是把個資存在**這台裝置的**
// localStorage，第二次結帳就變成「確認資料 → 送出」兩步、收件區塊預設收起來。
//
// ⚠ 這是便利，不是身分。伺服器不會因為 localStorage 有資料就認得她是誰；
// 真正的「登入後跨裝置看得到全部歷史」要等 LINE Login（第一期已把欄位留好）。

const PROFILE_KEY = "amber.profile.v1";

type Profile = {
  name: string;
  phone: string;
  email: string;
  lineId: string;
  shipKind: ShipKind;
  recipient: string;
  recipientPhone: string;
  address: string;
  cvsBrand: string;
  cvsStoreName: string;
  cvsStoreId: string;
};

const empty: Profile = {
  name: "",
  phone: "",
  email: "",
  lineId: "",
  shipKind: "cvs",
  recipient: "",
  recipientPhone: "",
  address: "",
  cvsBrand: "seven",
  cvsStoreName: "",
  cvsStoreId: "",
};

type Rejected = { name: string; reasonZh: string };

export function CheckoutForm() {
  const { lines, pricing, clear, ready, refresh } = useCart();

  const [p, setP] = useState<Profile>(empty);
  const [loaded, setLoaded] = useState(false);
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejected, setRejected] = useState<Rejected[]>([]);
  const [done, setDone] = useState<{ id: string; itemsTotal: number; memberPath: string | null } | null>(null);

  /** 冪等鍵：送出逾時重送不會變成兩張單 */
  const clientRef = useRef(crypto.randomUUID());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const saved = { ...empty, ...(JSON.parse(raw) as Partial<Profile>) };
        setP(saved);
        // 有存過就預設收起來——那正是「不用重填」的意思
        setEdit(!saved.name || !saved.phone);
      } else {
        setEdit(true);
      }
    } catch {
      setEdit(true);
    }
    setLoaded(true);
  }, []);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((s) => ({ ...s, [k]: v }));

  const totals = pricing.state === "ok" ? pricing.totals : null;

  const submit = async () => {
    setError(null);
    setRejected([]);
    setBusy(true);
    try {
      const res = await fetch("/api/amber/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: lines,
          ...p,
          // 收件人留空就沿用訂購人，少填兩個欄位
          recipient: p.recipient || p.name,
          recipientPhone: p.recipientPhone || p.phone,
          clientRef: clientRef.current,
          website: "", // 蜜罐，真人一定是空的
        }),
      });

      if (res.status === 409) {
        const data = (await res.json()) as { rejected?: Rejected[] };
        setRejected(data.rejected ?? []);
        setError("購物車裡有商品剛剛截止或被搶完了。請回購物車移除後再送出。");
        // 重新問一次價，讓購物車的標示同步更新
        refresh();
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; field?: string };
        setError(
          data.field === "phone"
            ? "手機號碼看起來不正確，請再確認一次。"
            : data.error === "multiple batches"
              ? "購物車裡有不同檔連線的商品，請分開結帳。"
              : "送出失敗，請再試一次。",
        );
        return;
      }

      const out = (await res.json()) as {
        id: string;
        itemsTotal: number;
        memberPath: string | null;
      };
      // 記住這台裝置的「我的訂單」連結，之後頁首直接有入口
      if (out.memberPath) rememberMyLink(out.memberPath);
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
      } catch {
        /* 忽略 */
      }
      clear();
      setDone(out);
    } catch {
      setError("網路不穩，請確認訊號後再送出一次。");
    } finally {
      setBusy(false);
    }
  };

  // ── 完成畫面 ───────────────────────────────────────
  if (done) {
    return (
      <div>
        <h1 className="am-h1">訂單成立 🎉</h1>
        <div className="am-note">
          <p style={{ margin: 0 }}>
            訂單編號 <strong>{done.id}</strong>
          </p>
          <p style={{ margin: "0.3rem 0 0" }}>商品小計 {twd(done.itemsTotal)}</p>
        </div>
        <div className="am-note">
          <strong>接下來會這樣進行</strong>
          <ol style={{ margin: "0.4rem 0 0", paddingInlineStart: "1.2rem" }}>
            <li>連線期間你可以繼續加購，訂單會自動併到同一張出貨單</li>
            <li>收單後我們去採購，缺貨的品項會從金額扣掉</li>
            <li>結單時用 LINE 通知你總金額與匯款方式</li>
          </ol>
        </div>
        {/* 「不用簡訊、不用密碼」的身分方案：給她一條專屬連結，
            傳給自己就好。比記住「編號＋手機」實際得多——
            連線期間下三次單就有三個編號，一定會弄丟。 */}
        {done.memberPath && (
          <div className="am-note">
            <strong>把你的專屬連結留起來 👇</strong>
            <p style={{ margin: "0.3rem 0 0.6rem" }}>
              之後查訂單、看金額、回報匯款都從這裡進去，不用記訂單編號。
              這台手機下次會直接出現在上面的選單裡。
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <ShareLine
                text={keepForMeText(SITE.shortName)}
                url={`${location.origin}${done.memberPath}`}
                label="用 LINE 傳給自己"
                className="am-btn am-btn--accent"
              />
              <ShareCopy url={`${location.origin}${done.memberPath}`} />
              <a className="am-btn am-btn--ghost" href={done.memberPath}>
                看我的訂單
              </a>
            </div>
          </div>
        )}

        <p className="am-field__hint">
          也可以用「訂單編號 + 下單手機」查詢：訂單編號是 {done.id}。
        </p>
        <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem" }}>
          <a className="am-btn am-btn--accent" href="/">
            繼續選購
          </a>
          <a className="am-btn am-btn--ghost" href="/order/lookup">
            查訂單
          </a>
        </div>
      </div>
    );
  }

  if (!ready || !loaded) return <p className="am-field__hint">載入中…</p>;

  if (lines.length === 0) {
    return (
      <div>
        <h1 className="am-h1">結帳</h1>
        <p className="am-empty">購物車是空的。</p>
        <a className="am-btn am-btn--accent" href="/">
          去逛逛
        </a>
      </div>
    );
  }

  const canSubmit =
    Boolean(p.name.trim() && p.phone.trim()) &&
    (p.shipKind === "home" ? Boolean(p.address.trim()) : Boolean(p.cvsStoreName.trim())) &&
    !busy &&
    Boolean(totals) &&
    totals!.lines.length > 0 &&
    totals!.blocked.filter((b) => b.status !== "gone").length === 0;

  return (
    <div>
      <h1 className="am-h1">結帳</h1>

      {error && <div className="am-err">{error}</div>}
      {rejected.length > 0 && (
        <div className="am-err">
          {rejected.map((r, i) => (
            <div key={i}>
              ・{r.name}　{r.reasonZh}
            </div>
          ))}
        </div>
      )}

      {totals && (
        <div className="am-sum" style={{ marginBottom: "1.2rem" }}>
          {totals.lines.map((l) => (
            <div className="am-sum__row" key={`${l.productId}:${l.optionId ?? ""}`}>
              <span>
                {l.name}
                {l.optionLabel ? `（${l.optionLabel}）` : ""} ×{l.qty}
              </span>
              <span>{twd(l.amount)}</span>
            </div>
          ))}
          <div className="am-sum__row am-sum__row--total">
            <span>商品小計</span>
            <span>{twd(totals.itemsTotal)}</span>
          </div>
          <p className="am-field__hint" style={{ marginTop: "0.5rem" }}>
            運費在結單時計算，同一檔連線下幾次單只收一次。
          </p>
        </div>
      )}

      {/* 存過資料就先摺起來——第二次結帳是「確認 → 送出」兩步 */}
      {!edit ? (
        <div className="am-note">
          <div>
            <strong>{p.name}</strong>　{p.phone}
          </div>
          <div className="am-line__spec">
            {p.shipKind === "cvs"
              ? `${SHIP_KIND_ZH.cvs}｜${CVS_BRANDS.find((b) => b.key === p.cvsBrand)?.name ?? ""} ${p.cvsStoreName}`
              : `${SHIP_KIND_ZH.home}｜${p.address}`}
          </div>
          <button type="button" className="am-copy" style={{ marginTop: "0.5rem" }} onClick={() => setEdit(true)}>
            修改資料
          </button>
        </div>
      ) : (
        <>
          <div className="am-field">
            <label htmlFor="c-name">姓名</label>
            <input id="c-name" value={p.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
          </div>
          <div className="am-field">
            <label htmlFor="c-phone">手機</label>
            <input
              id="c-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={p.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="0912345678"
            />
            <p className="am-field__hint">同一支手機的訂單會自動歸到同一位客人，也是之後查訂單用的。</p>
          </div>
          <div className="am-field">
            <label htmlFor="c-line">LINE 名稱或 ID（選填）</label>
            <input id="c-line" value={p.lineId} onChange={(e) => set("lineId", e.target.value)} />
            <p className="am-field__hint">方便我們在群組裡找到你。</p>
          </div>
          <div className="am-field">
            <label htmlFor="c-email">Email（選填）</label>
            <input
              id="c-email"
              type="email"
              autoComplete="email"
              value={p.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>

          <div className="am-field">
            <label>取貨方式</label>
            <div className="am-specs">
              {(["cvs", "home"] as ShipKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className="am-spec"
                  aria-pressed={p.shipKind === k}
                  onClick={() => set("shipKind", k)}
                >
                  {SHIP_KIND_ZH[k]}
                </button>
              ))}
            </div>
          </div>

          {p.shipKind === "cvs" ? (
            <>
              <div className="am-field">
                <label>超商</label>
                <div className="am-specs">
                  {CVS_BRANDS.map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      className="am-spec"
                      aria-pressed={p.cvsBrand === b.key}
                      onClick={() => set("cvsBrand", b.key)}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="am-field">
                <label htmlFor="c-store">門市名稱</label>
                <input
                  id="c-store"
                  value={p.cvsStoreName}
                  onChange={(e) => set("cvsStoreName", e.target.value)}
                  placeholder="例：民生門市"
                />
              </div>
              <div className="am-field">
                <label htmlFor="c-storeid">店號（選填）</label>
                <input
                  id="c-storeid"
                  inputMode="numeric"
                  value={p.cvsStoreId}
                  onChange={(e) => set("cvsStoreId", e.target.value)}
                />
                <p className="am-field__hint">填了比較不會寄錯門市。</p>
              </div>
            </>
          ) : (
            <div className="am-field">
              <label htmlFor="c-addr">收件地址</label>
              <input
                id="c-addr"
                autoComplete="street-address"
                value={p.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
          )}

          <div className="am-field">
            <label htmlFor="c-recv">收件人（跟訂購人不同才要填）</label>
            <input id="c-recv" value={p.recipient} onChange={(e) => set("recipient", e.target.value)} />
          </div>
          <div className="am-field">
            <label htmlFor="c-recvphone">收件人手機（同上）</label>
            <input
              id="c-recvphone"
              type="tel"
              inputMode="tel"
              value={p.recipientPhone}
              onChange={(e) => set("recipientPhone", e.target.value)}
            />
          </div>
        </>
      )}

      {/* 蜜罐。真人看不到，機器人會填。 */}
      <div className="am-hp" aria-hidden>
        <label htmlFor="website">網站</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="am-buybar">
        <div className="am-buybar__sum">
          商品小計
          <b>{totals ? twd(totals.itemsTotal) : "—"}</b>
        </div>
        <button
          type="button"
          className="am-btn am-btn--accent"
          disabled={!canSubmit}
          onClick={() => void submit()}
        >
          {busy ? "送出中…" : "送出訂單"}
        </button>
      </div>
    </div>
  );
}
