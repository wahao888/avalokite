import { describe, it, expect } from "vitest";

import {
  taipeiWallClockToInstant,
  instantToTaipeiParts,
  parseTaipeiLocalInput,
  toTaipeiLocalInput,
  formatTaipei,
} from "@/lib/tw-time";
import {
  effectiveDeadline,
  orderState,
  countdownLabel,
  isClosingSoon,
  type DeadlineBatch,
  type DeadlineProduct,
} from "@/lib/daigou-deadline";
import {
  normalizeCart,
  priceLines,
  priceFrom,
  priceLabel,
  MAX_QTY_PER_LINE,
  MAX_LINES,
  type LineSnapshot,
} from "@/app/sites/amber/_data/cart";
import {
  settleLine,
  settleTotals,
  effectiveQty,
  memberCredit,
  paidFromLedger,
  creditToApply,
  isLineStatus,
  isSettlementStatus,
  isFrozen,
  LINE_STATUSES,
  type LineForSettle,
} from "@/app/sites/amber/_data/settle";
import { normalizePhone, isMobile, maskPhone, maskName } from "@/app/sites/amber/_data/member";
import {
  allocate,
  sortCandidates,
  totalNeeded,
  type AllocCandidate,
} from "@/app/sites/amber/_data/allocate";
import {
  purchaseList,
  purchaseSummary,
  countsTowardPurchase,
  type PurchaseSourceLine,
} from "@/app/sites/amber/_data/purchase-list";
import { parseOptions, crossOptions, MAX_OPTIONS } from "@/app/sites/amber/_data/spec-presets";
import { CATEGORIES, isCategoryKey, categoryName } from "@/app/sites/amber/_data/categories";
import { lineShareUrl, keepForMeText, LINE_TEXT_MAX } from "@/lib/line-share";
import {
  settlementRequestText,
  shortageSummaryText,
  deadlineReminderText,
  shippedNoticeText,
} from "@/app/sites/amber/_data/notify-text";

// ────────────────────────────────────────────────────────────
// 台北時間
//
// 這一組是整份測試裡最重要的：Amber 上架時人在首爾（KST），
// 她心裡想的「台北 9/20 23:00」不能被存成台北的 22:00。
// vitest 的 TZ 由環境決定，所以這裡直接比對絕對的 epoch ms。
// ────────────────────────────────────────────────────────────
describe("台北時間換算", () => {
  // 台北 2026-09-20 23:00 = UTC 2026-09-20 15:00
  const TPE_2026_09_20_2300 = Date.UTC(2026, 8, 20, 15, 0);

  it("牆上時間 → 絕對瞬間（與執行環境的時區無關）", () => {
    const d = taipeiWallClockToInstant({
      year: 2026,
      month: 9,
      day: 20,
      hour: 23,
      minute: 0,
    });
    expect(d.getTime()).toBe(TPE_2026_09_20_2300);
  });

  it("往返不失真", () => {
    const parts = { year: 2026, month: 2, day: 29, hour: 8, minute: 5 };
    // 2026 不是閏年，2/29 應該被拒
    expect(parseTaipeiLocalInput("2026-02-29T08:05")).toBeNull();

    const ok = { year: 2026, month: 3, day: 1, hour: 8, minute: 5 };
    expect(instantToTaipeiParts(taipeiWallClockToInstant(ok))).toEqual(ok);
    void parts;
  });

  it("解析 datetime-local 的值", () => {
    expect(parseTaipeiLocalInput("2026-09-20T23:00")!.getTime()).toBe(
      TPE_2026_09_20_2300,
    );
    // 帶秒數也接受（某些瀏覽器會加）
    expect(parseTaipeiLocalInput("2026-09-20T23:00:00")!.getTime()).toBe(
      TPE_2026_09_20_2300,
    );
  });

  it("格式不合的輸入一律回 null，不猜", () => {
    for (const bad of [
      "",
      "2026-09-20",
      "2026/09/20 23:00",
      "2026-13-01T00:00",
      "2026-09-20T25:00",
      "2026-09-20T23:99",
      "not a date",
      "2026-11-31T10:00", // 11 月沒有 31 號
    ]) {
      expect(parseTaipeiLocalInput(bad), bad).toBeNull();
    }
  });

  it("toTaipeiLocalInput 產出可直接回填表單的字串", () => {
    expect(toTaipeiLocalInput(new Date(TPE_2026_09_20_2300))).toBe("2026-09-20T23:00");
  });

  it("顯示格式固定，前後端逐字相同（避免 hydration mismatch）", () => {
    const d = new Date(TPE_2026_09_20_2300);
    expect(formatTaipei(d)).toBe("2026/09/20 23:00");
    expect(formatTaipei(d, { withTime: false })).toBe("2026/09/20");
  });

  it("跨日邊界：UTC 還在 9/20，台北已經是 9/21", () => {
    const d = new Date(Date.UTC(2026, 8, 20, 16, 30)); // 台北 9/21 00:30
    expect(formatTaipei(d)).toBe("2026/09/21 00:30");
  });
});

// ────────────────────────────────────────────────────────────
// 收單截止
// ────────────────────────────────────────────────────────────
describe("收單截止", () => {
  const openBatch: DeadlineBatch = {
    defaultDeadlineAt: new Date("2026-09-20T15:00:00Z"), // 台北 23:00
    status: "open",
  };
  const liveProduct: DeadlineProduct = { deadlineAt: null, status: "live" };

  it("商品的截止時間覆寫檔期", () => {
    const own = new Date("2026-09-18T15:00:00Z");
    expect(effectiveDeadline({ deadlineAt: own, status: "live" }, openBatch)).toEqual(own);
  });

  it("商品沒設就繼承檔期", () => {
    expect(effectiveDeadline(liveProduct, openBatch)).toEqual(openBatch.defaultDeadlineAt);
  });

  it("兩者都沒設 = 永不截止（現貨分類需要）", () => {
    const noDeadlineBatch: DeadlineBatch = { defaultDeadlineAt: null, status: "open" };
    expect(effectiveDeadline(liveProduct, noDeadlineBatch)).toBeNull();

    const far = new Date("2099-01-01T00:00:00Z");
    expect(orderState(liveProduct, noDeadlineBatch, far).open).toBe(true);
  });

  it("到點就算截止（>=），不多給一毫秒", () => {
    const deadline = openBatch.defaultDeadlineAt!;

    const justBefore = new Date(deadline.getTime() - 1);
    expect(orderState(liveProduct, openBatch, justBefore).open).toBe(true);

    const exactly = new Date(deadline.getTime());
    const s = orderState(liveProduct, openBatch, exactly);
    expect(s.open).toBe(false);
    expect(s.open === false && s.reason).toBe("expired");
  });

  it("檔期收單後，即使商品自己的時間還沒到也不能下單", () => {
    const closedBatch: DeadlineBatch = { ...openBatch, status: "closed" };
    const early = new Date("2026-09-01T00:00:00Z");
    const s = orderState(liveProduct, closedBatch, early);
    expect(s.open).toBe(false);
    expect(s.open === false && s.reason).toBe("batch-closed");
  });

  it("草稿商品的原因是「已下架」而不是「本檔已收單」（回報最根本的原因）", () => {
    const closedBatch: DeadlineBatch = { ...openBatch, status: "closed" };
    const draft: DeadlineProduct = { deadlineAt: null, status: "draft" };
    const s = orderState(draft, closedBatch, new Date("2026-09-01T00:00:00Z"));
    expect(s.open === false && s.reason).toBe("not-live");
  });

  it("倒數文字", () => {
    const now = new Date("2026-09-01T00:00:00Z");
    const at = (ms: number) => countdownLabel(new Date(now.getTime() + ms), now);
    expect(at(3 * 86400_000)).toBe("剩 3 天");
    expect(at(6 * 3600_000)).toBe("剩 6 小時");
    expect(at(12 * 60_000)).toBe("剩 12 分鐘");
    expect(at(30_000)).toBe("即將截止");
    expect(at(0)).toBe("已截止");
    expect(at(-1000)).toBe("已截止");
  });

  it("快截止的警示區間", () => {
    const now = new Date("2026-09-01T00:00:00Z");
    expect(isClosingSoon(new Date(now.getTime() + 3600_000), now)).toBe(true);
    expect(isClosingSoon(new Date(now.getTime() + 2 * 86400_000), now)).toBe(false);
    expect(isClosingSoon(new Date(now.getTime() - 1), now)).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// 購物車
// ────────────────────────────────────────────────────────────
describe("購物車正規化（輸入來自 localStorage，使用者可改）", () => {
  it("形狀不對的一律丟掉，不拋例外", () => {
    expect(normalizeCart(null)).toEqual([]);
    expect(normalizeCart("nope")).toEqual([]);
    expect(
      normalizeCart([
        null,
        "x",
        {},
        { productId: "", qty: 1 },
        { productId: "p1" },
        { productId: "p1", qty: 0 },
        { productId: "p1", qty: -3 },
        { productId: "p1", qty: NaN },
        { productId: "p1", qty: "abc" },
      ]),
    ).toEqual([]);
  });

  it("同一個 商品×規格 會合併數量", () => {
    const out = normalizeCart([
      { productId: "p1", optionId: "o1", qty: 2 },
      { productId: "p1", optionId: "o1", qty: 3 },
    ]);
    expect(out).toEqual([{ productId: "p1", optionId: "o1", qty: 5 }]);
  });

  it("不同規格是不同的行", () => {
    const out = normalizeCart([
      { productId: "p1", optionId: "o1", qty: 1 },
      { productId: "p1", optionId: "o2", qty: 1 },
      { productId: "p1", optionId: null, qty: 1 },
    ]);
    expect(out).toHaveLength(3);
  });

  it("數量與行數都有上限", () => {
    expect(normalizeCart([{ productId: "p1", optionId: null, qty: 9999 }])[0].qty).toBe(
      MAX_QTY_PER_LINE,
    );
    const many = Array.from({ length: MAX_LINES + 20 }, (_, i) => ({
      productId: `p${i}`,
      optionId: null,
      qty: 1,
    }));
    expect(normalizeCart(many)).toHaveLength(MAX_LINES);
  });

  it("小數數量無條件捨去", () => {
    expect(normalizeCart([{ productId: "p1", optionId: null, qty: 2.9 }])[0].qty).toBe(2);
  });
});

describe("購物車計價", () => {
  const NOW = new Date("2026-09-15T00:00:00Z");
  const openBatch: DeadlineBatch = {
    defaultDeadlineAt: new Date("2026-09-20T15:00:00Z"),
    status: "open",
  };

  const snap = (over: Partial<LineSnapshot> = {}): LineSnapshot => ({
    productId: "p1",
    optionId: null,
    batchId: "b1",
    name: "冰絲襪",
    optionLabel: null,
    unitPrice: 250,
    imageKey: null,
    stock: null,
    preorder: false,
    product: { deadlineAt: null, status: "live" },
    batch: openBatch,
    ...over,
  });

  it("金額 = 數量 × 單價，且只算得出下單的行", () => {
    const t = priceLines([{ productId: "p1", optionId: null, qty: 3 }], [snap()], NOW);
    expect(t.lines).toHaveLength(1);
    expect(t.lines[0].amount).toBe(750);
    expect(t.itemsTotal).toBe(750);
    expect(t.count).toBe(3);
    expect(t.blocked).toEqual([]);
  });

  it("價格來自伺服器快照，客戶端偽造的金額一律無效", () => {
    const forged = [
      { productId: "p1", optionId: null, qty: 1, unitPrice: 1, amount: 1 },
    ] as unknown as { productId: string; optionId: string | null; qty: number }[];
    const t = priceLines(forged, [snap()], NOW);
    expect(t.itemsTotal).toBe(250);
  });

  it("已截止的行進 blocked，但絕不靜默消失", () => {
    const late = new Date("2026-09-21T00:00:00Z");
    const t = priceLines([{ productId: "p1", optionId: null, qty: 2 }], [snap()], late);
    expect(t.lines).toEqual([]);
    expect(t.blocked).toHaveLength(1);
    expect(t.blocked[0].status).toBe("expired");
    // 名稱與金額仍要看得到，客人才知道被擋的是哪一筆
    expect(t.blocked[0].name).toBe("冰絲襪");
    expect(t.itemsTotal).toBe(0);
  });

  it("找不到商品 → gone（那件商品已被移除，客人本來就沒有期待）", () => {
    const t = priceLines([{ productId: "ghost", optionId: null, qty: 1 }], [], NOW);
    expect(t.blocked[0].status).toBe("gone");
    expect(t.itemsTotal).toBe(0);
  });

  it("庫存不足 → oos", () => {
    const t = priceLines(
      [{ productId: "p1", optionId: null, qty: 5 }],
      [snap({ stock: 2 })],
      NOW,
    );
    expect(t.blocked[0].status).toBe("oos");
  });

  it("允許預購的商品跳過庫存檢查（那正是預購的意思）", () => {
    const t = priceLines(
      [{ productId: "p1", optionId: null, qty: 5 }],
      [snap({ stock: 0, preorder: true })],
      NOW,
    );
    expect(t.lines).toHaveLength(1);
    expect(t.itemsTotal).toBe(1250);
  });

  it("庫存剛好夠是可以下單的（邊界）", () => {
    const t = priceLines(
      [{ productId: "p1", optionId: null, qty: 2 }],
      [snap({ stock: 2 })],
      NOW,
    );
    expect(t.lines).toHaveLength(1);
  });

  it("混合車：可買的照算，被擋的分開列", () => {
    const t = priceLines(
      [
        { productId: "p1", optionId: null, qty: 2 },
        { productId: "p2", optionId: null, qty: 1 },
      ],
      [
        snap(),
        snap({
          productId: "p2",
          name: "針織外套",
          unitPrice: 1200,
          product: { deadlineAt: new Date("2026-09-01T00:00:00Z"), status: "live" },
        }),
      ],
      NOW,
    );
    expect(t.itemsTotal).toBe(500);
    expect(t.blocked).toHaveLength(1);
    expect(t.blocked[0].name).toBe("針織外套");
  });
});

describe("價格顯示（NT$250 起）", () => {
  it("沒有規格就顯示商品價", () => {
    expect(priceLabel(250, [])).toBe("NT$250");
  });
  it("規格全部同價不加「起」", () => {
    expect(priceFrom(250, [null, null])).toEqual({ min: 250, ranged: false });
    expect(priceLabel(250, [null, 250])).toBe("NT$250");
  });
  it("規格有不同價才顯示「起」，且取最低價", () => {
    expect(priceFrom(250, [null, 380])).toEqual({ min: 250, ranged: true });
    expect(priceLabel(250, [null, 380])).toBe("NT$250 起");
  });
  it("規格價低於商品價時，起價是規格價", () => {
    expect(priceLabel(500, [250, 500])).toBe("NT$250 起");
  });
  it("千分位", () => {
    expect(priceLabel(1500, [])).toBe("NT$1,500");
  });
});

// ────────────────────────────────────────────────────────────
// 對帳鏈 —— 這一組守住整個系統的金錢正確性
// ────────────────────────────────────────────────────────────
describe("結單對帳", () => {
  const line = (over: Partial<LineForSettle> = {}): LineForSettle => ({
    unitPrice: 100,
    qty: 5,
    amount: 500,
    gotQty: null,
    status: "ordered",
    ...over,
  });

  it("還沒採購時先當作會全部買到（採購前的預估金額才有意義）", () => {
    expect(effectiveQty(line())).toBe(5);
    expect(settleLine(line()).deduct).toBe(0);
  });

  it("已買到且數量足額 → 不扣", () => {
    expect(settleLine(line({ status: "bought" })).deduct).toBe(0);
  });

  it("訂 5 只買到 3 → 扣 2 × 單價，且 qty 仍是 5", () => {
    const l = line({ status: "bought", gotQty: 3 });
    const s = settleLine(l);
    expect(s.effectiveQty).toBe(3);
    expect(s.effectiveAmount).toBe(300);
    expect(s.deduct).toBe(200);
    expect(l.qty).toBe(5); // 原始快照沒有被動過
    expect(l.amount).toBe(500);
  });

  it("缺貨 → 全額扣除", () => {
    expect(settleLine(line({ status: "oos" })).deduct).toBe(500);
  });

  it("取消（客人要求）與退款 → 全額扣除", () => {
    expect(settleLine(line({ status: "cancelled" })).deduct).toBe(500);
    expect(settleLine(line({ status: "refunded" })).deduct).toBe(500);
  });

  it("gotQty 不會超過 qty（防手動輸入超發）", () => {
    expect(effectiveQty(line({ status: "bought", gotQty: 99 }))).toBe(5);
  });

  it("對帳鏈：應付 = 原始 − 扣除 + 調整 + 運費 − 折抵", () => {
    const t = settleTotals({
      lines: [
        line({ status: "bought", unitPrice: 300, qty: 5, amount: 1500 }),
        line({ status: "oos", unitPrice: 800, qty: 1, amount: 800 }),
      ],
      shippingFee: 160,
      adjustAmount: -60,
      creditApplied: 100,
      paidAmount: 0,
    });
    expect(t.grossAmount).toBe(2300);
    expect(t.deductAmount).toBe(800);
    expect(t.payableAmount).toBe(2300 - 800 - 60 + 160 - 100);
    expect(t.balance).toBe(t.payableAmount);
  });

  it("Amber 舉的例子：三筆跨天訂單合併 = $4,300，運費只收一次", () => {
    const t = settleTotals({
      lines: [
        line({ status: "bought", unitPrice: 1500, qty: 1, amount: 1500 }), // 9/15
        line({ status: "bought", unitPrice: 800, qty: 1, amount: 800 }), // 9/16
        line({ status: "bought", unitPrice: 2000, qty: 1, amount: 2000 }), // 9/18
      ],
      shippingFee: 160,
    });
    expect(t.grossAmount).toBe(4300);
    expect(t.deductAmount).toBe(0);
    expect(t.payableAmount).toBe(4460); // 運費就這一次
  });

  it("實收大於應收 → balance 為負（要退錢）", () => {
    const t = settleTotals({
      lines: [line({ status: "oos" })],
      paidAmount: 500,
    });
    expect(t.payableAmount).toBe(0);
    expect(t.balance).toBe(-500);
  });

  it("折抵超過應付時應付歸零，不倒找錢", () => {
    const t = settleTotals({
      lines: [line({ status: "bought", unitPrice: 100, qty: 1, amount: 100 })],
      creditApplied: 500,
    });
    expect(t.payableAmount).toBe(0);
  });

  it("不變量：任何狀態組合都不會改變 grossAmount", () => {
    const base = [
      line({ unitPrice: 100, qty: 2, amount: 200 }),
      line({ unitPrice: 350, qty: 1, amount: 350 }),
      line({ unitPrice: 80, qty: 4, amount: 320 }),
    ];
    const gross = 200 + 350 + 320;

    for (const s0 of LINE_STATUSES) {
      for (const s1 of LINE_STATUSES) {
        for (const s2 of LINE_STATUSES) {
          const t = settleTotals({
            lines: [
              { ...base[0], status: s0 },
              { ...base[1], status: s1 },
              { ...base[2], status: s2 },
            ],
          });
          expect(t.grossAmount, `${s0}/${s1}/${s2}`).toBe(gross);
          // 扣除額永遠介於 0 與原始金額之間
          expect(t.deductAmount).toBeGreaterThanOrEqual(0);
          expect(t.deductAmount).toBeLessThanOrEqual(gross);
        }
      }
    }
  });

  it("狀態守衛", () => {
    expect(isLineStatus("bought")).toBe(true);
    expect(isLineStatus("shipped")).toBe(false);
    expect(isSettlementStatus("awaiting")).toBe(true);
    expect(isSettlementStatus("bought")).toBe(false);
    expect(isFrozen("open")).toBe(false);
    expect(isFrozen("awaiting")).toBe(true);
  });
});

describe("折抵與收款流水", () => {
  it("折抵餘額 = credit − credit_use", () => {
    expect(
      memberCredit([
        { kind: "credit", amount: 300 },
        { kind: "credit_use", amount: 100 },
        { kind: "payment", amount: 9999 }, // 與折抵無關
      ]),
    ).toBe(200);
  });

  it("折抵餘額不會是負數", () => {
    expect(memberCredit([{ kind: "credit_use", amount: 100 }])).toBe(0);
  });

  it("已收 = 收款 − 退款（折抵不算現金）", () => {
    expect(
      paidFromLedger([
        { kind: "payment", amount: 4460 },
        { kind: "refund", amount: 200 },
        { kind: "credit", amount: 500 },
      ]),
    ).toBe(4260);
  });

  it("可套用的折抵不超過應付金額", () => {
    expect(creditToApply(500, 300)).toBe(300);
    expect(creditToApply(200, 300)).toBe(200);
    expect(creditToApply(0, 300)).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────
// 會員歸戶
// ────────────────────────────────────────────────────────────
describe("手機正規化（會員歸戶鍵）", () => {
  it("同一支號碼的各種寫法都收斂到同一個 key", () => {
    const forms = [
      "0912345678",
      "0912-345-678",
      "0912 345 678",
      "(0912)345678",
      "+886912345678",
      "+886 912 345 678",
      "886912345678",
      "０９１２３４５６７８",
      "912345678", // 漏打開頭的 0
    ];
    const keys = new Set(forms.map((f) => normalizePhone(f)));
    expect([...keys]).toEqual(["0912345678"]);
  });

  it("市話也處理", () => {
    expect(normalizePhone("02-1234-5678")).toBe("0212345678");
    expect(normalizePhone("+886221234567")).toBe("0221234567");
  });

  it("認不出來就回 null，不猜", () => {
    for (const bad of ["", "  ", "abc", "12", "0912345678901234", null, undefined]) {
      expect(normalizePhone(bad as string), String(bad)).toBeNull();
    }
  });

  it("分得出手機與市話", () => {
    expect(isMobile("0912345678")).toBe(true);
    expect(isMobile("0212345678")).toBe(false);
  });

  it("⚠ 遮罩前一定要先正規化——直接去符號會讓 +886 顯示成 8869-***-678", () => {
    // 2026-09-07 實測踩到：結單頁原本寫 maskPhone(raw.replace(/\D/g,""))，
    // 客人用 +886912345678 下單時就顯示成 8869-***-678，看起來像壞掉。
    // 收件電話存的是客人當下打的原字串，所以遮罩前必須經過 normalizePhone。
    for (const raw of ["0912345678", "0912-345-678", "+886912345678", "886912345678"]) {
      expect(maskPhone(normalizePhone(raw)), raw).toBe("0912-***-678");
    }
  });

  it("遮罩（/s/<token> 頁面可能被轉貼到群組）", () => {
    expect(maskPhone("0912345678")).toBe("0912-***-678");
    expect(maskName("王小明")).toBe("王＊明");
    expect(maskName("陳大文豪")).toBe("陳＊＊豪");
    expect(maskName("李四")).toBe("李＊");
    expect(maskName("A")).toBe("A");
  });
});

// ────────────────────────────────────────────────────────────
// 缺貨分配
// ────────────────────────────────────────────────────────────
describe("缺貨分配（先到先給）", () => {
  const at = (iso: string) => new Date(iso);
  const cand = (lineId: string, iso: string, qty: number): AllocCandidate => ({
    lineId,
    orderId: `o-${lineId}`,
    orderedAt: at(iso),
    qty,
  });

  const seven = [
    cand("a", "2026-09-15T10:00:00Z", 3),
    cand("b", "2026-09-16T10:00:00Z", 2),
    cand("c", "2026-09-18T10:00:00Z", 2),
  ]; // 共 7 件

  it("需要 7 買到 5：先下單的先給", () => {
    const out = allocate(seven, 5);
    expect(out).toEqual([
      { lineId: "a", gotQty: 3, status: "bought" },
      { lineId: "b", gotQty: 2, status: "bought" },
      { lineId: "c", gotQty: 0, status: "oos" },
    ]);
  });

  it("部分分配：中間那筆只拿到一半", () => {
    const out = allocate(seven, 4);
    expect(out.map((o) => o.gotQty)).toEqual([3, 1, 0]);
    // 只拿到一部分仍算 bought，短少由 gotQty 表達
    expect(out[1].status).toBe("bought");
    expect(out[2].status).toBe("oos");
  });

  it("完全沒買到 → 全部 oos", () => {
    expect(allocate(seven, 0).every((o) => o.status === "oos")).toBe(true);
  });

  it("買到的比需要的多也不會超發", () => {
    const out = allocate(seven, 99);
    expect(out.map((o) => o.gotQty)).toEqual([3, 2, 2]);
  });

  it("負數與 NaN 當 0", () => {
    expect(allocate(seven, -5).every((o) => o.gotQty === 0)).toBe(true);
    expect(allocate(seven, NaN).every((o) => o.gotQty === 0)).toBe(true);
  });

  it("不變量：發出去的總數 = min(買到, 需要)", () => {
    const need = totalNeeded(seven);
    for (let got = 0; got <= need + 3; got++) {
      const sum = allocate(seven, got).reduce((s, o) => s + o.gotQty, 0);
      expect(sum, `got=${got}`).toBe(Math.min(got, need));
    }
  });

  it("時間相同時用 lineId 破平手，結果必須是決定性的", () => {
    const same = "2026-09-15T10:00:00Z";
    const tie = [cand("z", same, 1), cand("a", same, 1), cand("m", same, 1)];
    expect(sortCandidates(tie).map((c) => c.lineId)).toEqual(["a", "m", "z"]);
    // 跑兩次結果一樣（她按兩次「套用」不該換人缺貨）
    expect(allocate(tie, 2)).toEqual(allocate(tie, 2));
    expect(allocate(tie, 2).map((o) => o.gotQty)).toEqual([1, 1, 0]);
  });

  it("輸入順序不影響結果", () => {
    const shuffled = [seven[2], seven[0], seven[1]];
    expect(allocate(shuffled, 5)).toEqual(allocate(seven, 5));
  });
});

// ────────────────────────────────────────────────────────────
// 採購清單
// ────────────────────────────────────────────────────────────
describe("採購清單彙總", () => {
  const src = (over: Partial<PurchaseSourceLine> = {}): PurchaseSourceLine => ({
    lineId: "l1",
    orderId: "o1",
    orderedAt: new Date("2026-09-15T10:00:00Z"),
    orderStatus: "open",
    memberName: "王小明",
    productId: "p1",
    optionId: "op-m",
    name: "冰絲襪",
    optionLabel: "黑 / M",
    imageKey: null,
    qty: 3,
    gotQty: null,
    status: "ordered",
    ...over,
  });

  it("跨訂單依 商品×規格 加總", () => {
    const groups = purchaseList([
      src({ lineId: "l1", orderId: "o1", qty: 3 }),
      src({ lineId: "l2", orderId: "o2", qty: 2 }),
      src({ lineId: "l3", orderId: "o3", optionId: "op-l", optionLabel: "黑 / L", qty: 3 }),
    ]);
    expect(groups).toHaveLength(2);
    const m = groups.find((g) => g.optionLabel === "黑 / M")!;
    expect(m.needQty).toBe(5);
    expect(m.lines).toHaveLength(2);
    expect(m.candidates).toHaveLength(2);
  });

  it("作廢訂單不計入（她自己的測試單不能害她多買）", () => {
    expect(countsTowardPurchase(src({ orderStatus: "void" }))).toBe(false);
    const groups = purchaseList([
      src({ lineId: "l1", qty: 3 }),
      src({ lineId: "l2", orderStatus: "void", qty: 99 }),
    ]);
    expect(groups[0].needQty).toBe(3);
  });

  it("已取消／已退款的行不必再去買", () => {
    expect(countsTowardPurchase(src({ status: "cancelled" }))).toBe(false);
    expect(countsTowardPurchase(src({ status: "refunded" }))).toBe(false);
    // 缺貨的留著：她可能到別家補到，需求還在
    expect(countsTowardPurchase(src({ status: "oos" }))).toBe(true);
  });

  it("尚未採購的行，「已買到」預設等於需求量（順利時她一個字都不用打）", () => {
    const g = purchaseList([src({ qty: 4 })])[0];
    expect(g.needQty).toBe(4);
    expect(g.gotQty).toBe(4);
    expect(g.settled).toBe(false);
  });

  it("已標記過的行照實反映，並標成已處理", () => {
    const g = purchaseList([
      src({ lineId: "l1", qty: 5, status: "bought", gotQty: 3 }),
      src({ lineId: "l2", qty: 2, status: "oos", gotQty: 0 }),
    ])[0];
    expect(g.needQty).toBe(7);
    expect(g.gotQty).toBe(3);
    expect(g.settled).toBe(true);
  });

  it("摘要：還沒處理的排前面", () => {
    const groups = purchaseList([
      src({ lineId: "l1", optionId: "a", optionLabel: "A", status: "bought", gotQty: 3 }),
      src({ lineId: "l2", optionId: "b", optionLabel: "B", status: "ordered" }),
    ]);
    expect(groups[0].optionLabel).toBe("B");
    const s = purchaseSummary(groups);
    expect(s.totalNeed).toBe(6);
    expect(s.pendingGroups).toBe(1);
  });

  it("短缺件數", () => {
    const groups = purchaseList([
      src({ qty: 5, status: "bought", gotQty: 2 }),
    ]);
    expect(purchaseSummary(groups).shortage).toBe(3);
  });
});

// ────────────────────────────────────────────────────────────
// 規格
// ────────────────────────────────────────────────────────────
describe("規格輸入", () => {
  it("逗號、頓號、換行、斜線都當分隔", () => {
    expect(parseOptions("黑,白、灰\n藍/粉")).toEqual(["黑", "白", "灰", "藍", "粉"]);
  });
  it("去空白、去重、保留順序", () => {
    expect(parseOptions(" 黑 , 白 , 黑 ")).toEqual(["黑", "白"]);
  });
  it("空字串回空陣列", () => {
    expect(parseOptions("   ")).toEqual([]);
  });
  it("交叉產生器：兩軸 → 扁平清單", () => {
    expect(crossOptions(["黑", "白"], ["S", "M", "L"])).toEqual([
      "黑-S", "黑-M", "黑-L", "白-S", "白-M", "白-L",
    ]);
  });
  it("只填一軸時原樣回傳", () => {
    expect(crossOptions([], ["S", "M"])).toEqual(["S", "M"]);
    expect(crossOptions(["黑"], [])).toEqual(["黑"]);
  });
  it("交叉的結果也受 MAX_OPTIONS 限制", () => {
    const a = Array.from({ length: 10 }, (_, i) => `a${i}`);
    const b = Array.from({ length: 10 }, (_, i) => `b${i}`);
    expect(crossOptions(a, b)).toHaveLength(MAX_OPTIONS);
  });
});

describe("分類", () => {
  it("九個分類，key 不重複", () => {
    expect(CATEGORIES).toHaveLength(9);
    expect(new Set(CATEGORIES.map((c) => c.key)).size).toBe(9);
  });
  it("現貨標為隨時可買", () => {
    expect(CATEGORIES.find((c) => c.key === "instock")!.alwaysOpen).toBe(true);
  });
  it("認不得的 key 退成「未分類」而不是爆掉", () => {
    expect(isCategoryKey("korea")).toBe(true);
    expect(isCategoryKey("nope")).toBe(false);
    expect(categoryName("nope")).toBe("未分類");
    expect(categoryName(null)).toBe("未分類");
    expect(categoryName("korea")).toBe("韓國連線");
  });
});

// ────────────────────────────────────────────────────────────
// 通知文字
// ────────────────────────────────────────────────────────────
describe("通知文字", () => {
  const bank = {
    bankName: "國泰世華",
    bankCode: "013",
    account: "1234567890",
    holder: "王小美",
  };
  const linepay = { lineId: "@amber", payLink: "" };

  const totals = settleTotals({
    lines: [
      { unitPrice: 1500, qty: 1, amount: 1500, gotQty: null, status: "bought" },
      { unitPrice: 800, qty: 1, amount: 800, gotQty: null, status: "oos" },
      { unitPrice: 2000, qty: 1, amount: 2000, gotQty: null, status: "bought" },
    ],
    shippingFee: 160,
  });

  const items = [
    { name: "冰絲襪", optionLabel: "黑 / M", qty: 1, effectiveQty: 1, status: "bought" },
    { name: "針織外套", optionLabel: null, qty: 1, effectiveQty: 0, status: "oos" },
    { name: "帆布鞋", optionLabel: "240", qty: 1, effectiveQty: 1, status: "bought" },
  ];

  it("請款文字含金額拆解、付款方式與專屬連結", () => {
    const text = settlementRequestText({
      memberName: "王小明",
      batchTitle: "9 月韓國連線",
      totals,
      items,
      url: "https://amber.avalokite.xyz/s/abc123",
      bank,
      linepay,
    });

    // 金額必須與 settleTotals 算出來的一致（不可兩邊各算一次）
    expect(text).toContain("NT$4,300"); // 原始
    expect(text).toContain("−NT$800"); // 缺貨扣除
    expect(text).toContain("NT$160"); // 運費
    expect(text).toContain(`NT$${totals.payableAmount.toLocaleString("en-US")}`);
    expect(totals.payableAmount).toBe(3660);

    expect(text).toContain("https://amber.avalokite.xyz/s/abc123");
    expect(text).toContain("國泰世華");
    expect(text).toContain("1234567890");
    expect(text).toContain("王小明");
    // 缺貨的品項要講出來
    expect(text).toContain("針織外套");
  });

  it("沒填銀行帳號時退成「另外私訊」，不留空欄位", () => {
    const text = settlementRequestText({
      memberName: "王小明",
      batchTitle: "9 月韓國連線",
      totals,
      items,
      url: "https://x/s/a",
      bank: { bankName: "", bankCode: "", account: "", holder: "" },
      linepay: { lineId: "", payLink: "" },
    });
    expect(text).toContain("另外私訊");
    expect(text).not.toContain("帳號 \n");
  });

  it("全部買到時，缺貨區塊完全不出現", () => {
    const allGot = settleTotals({
      lines: [{ unitPrice: 100, qty: 1, amount: 100, gotQty: null, status: "bought" }],
      shippingFee: 160,
    });
    const text = settlementRequestText({
      memberName: "李小華",
      batchTitle: "9 月韓國連線",
      totals: allGot,
      items: [
        { name: "冰絲襪", optionLabel: null, qty: 1, effectiveQty: 1, status: "bought" },
      ],
      url: "https://x/s/a",
      bank,
      linepay,
    });
    expect(text).not.toContain("未能買到");
    expect(text).not.toContain("缺貨扣除");
  });

  it("缺貨總表：沒缺貨時是一句好消息，不是空清單", () => {
    expect(shortageSummaryText({ batchTitle: "9 月韓國連線", items: [] })).toContain(
      "全部都買到",
    );
  });

  it("收單提醒帶倒數", () => {
    const now = new Date("2026-09-20T09:00:00Z");
    const text = deadlineReminderText({
      batchTitle: "9 月韓國連線",
      deadline: new Date("2026-09-20T15:00:00Z"),
      now,
      url: "https://x",
    });
    expect(text).toContain("剩 6 小時");
    expect(text).toContain("2026/09/20 23:00");
  });

  it("出貨通知含單號與預計到貨日", () => {
    const text = shippedNoticeText({
      memberName: "王小明",
      batchTitle: "9 月韓國連線",
      shipNo: "ABC123456",
      shipMethod: "7-ELEVEN 取貨",
      etaAt: new Date("2026-09-28T02:00:00Z"),
      url: "https://x/s/a",
    });
    expect(text).toContain("ABC123456");
    expect(text).toContain("2026/09/28");
  });

  it("文字不含未替換的模板殘留", () => {
    const text = settlementRequestText({
      memberName: "王小明",
      batchTitle: "9 月韓國連線",
      totals,
      items,
      url: "https://x/s/a",
      bank,
      linepay,
    });
    expect(text).not.toMatch(/undefined|null|NaN|\[object/);
    // 不該有連續兩個以上的空行（貼到 LINE 會很醜）
    expect(text).not.toMatch(/\n\n\n/);
  });

  it("⚠ 段落之間要有空行——沒有的話貼到 LINE 是一整片牆", () => {
    // 2026-09-07 實測踩到：nl() 原本用 Boolean(l) 過濾，
    // 把刻意插入的空字串（段落分隔）也一起吃掉了，
    // 文字擠成一整片，客人看不出金額在哪一段。
    const text = settlementRequestText({
      memberName: "王小明",
      batchTitle: "9 月韓國連線",
      totals,
      items,
      url: "https://x/s/a",
      bank,
      linepay,
    });
    expect(text).toMatch(/\n\n/);
    // 金額區塊要被空行與品項清單隔開
    const idx = text.indexOf("商品金額");
    expect(text.slice(0, idx)).toMatch(/\n\n/);
  });
});

// ────────────────────────────────────────────────────────────
// 分享到 LINE
// ────────────────────────────────────────────────────────────
describe("LINE 分享連結", () => {
  const decode = (u: string) => decodeURIComponent(u.replace("https://line.me/R/msg/text/?", ""));

  it("組出 LINE 的分享 scheme，文字與網址都經過編碼", () => {
    const u = lineShareUrl("9 月韓國連線 開跑囉！", "https://amber.avalokite.xyz/");
    expect(u.startsWith("https://line.me/R/msg/text/?")).toBe(true);
    expect(decode(u)).toBe("9 月韓國連線 開跑囉！\nhttps://amber.avalokite.xyz/");
  });

  it("換行、# 與 & 都要編碼掉，否則連結會在 LINE 裡被截斷", () => {
    const u = lineShareUrl("a\nb&c#d", "https://x/?q=1&r=2");
    expect(u).not.toContain("\n");
    expect(u).not.toMatch(/[&#](?!.*text)/);
    expect(decode(u)).toBe("a\nb&c#d\nhttps://x/?q=1&r=2");
  });

  it("⚠ 太長時截的是文字，連結一定要留住", () => {
    // 連結放在最後，天真的截斷會把它切掉——那則訊息就完全失去意義。
    const url = "https://amber.avalokite.xyz/p/some-long-product-slug";
    const u = lineShareUrl("字".repeat(2000), url);
    const out = decode(u);
    expect(out.endsWith(url)).toBe(true);
    expect(out).toContain("…");
    expect(out.length).toBeLessThanOrEqual(LINE_TEXT_MAX);
  });

  it("剛好等於上限時不截斷", () => {
    const url = "https://x/y";
    const body = "字".repeat(LINE_TEXT_MAX - url.length - 1);
    const out = decode(lineShareUrl(body, url));
    expect(out).not.toContain("…");
    expect(out.endsWith(url)).toBe(true);
  });

  it("沒有網址時只送文字", () => {
    expect(decode(lineShareUrl("嗨"))).toBe("嗨");
  });

  it("「傳給自己」的文字帶站名，客人在 LINE 裡才認得出是誰", () => {
    expect(keepForMeText("Amber")).toContain("Amber");
  });
});
