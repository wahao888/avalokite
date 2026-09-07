import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getTenant, tenantOrigin } from "@/lib/tenants";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { notifyTenant } from "@/lib/mail";
import {
  loadPricing,
  upsertMemberByPhone,
  createDaigouOrder,
  ensureMemberToken,
  OrderRejected,
} from "@/lib/daigou-data";
import { normalizeCart, priceLines, twd, MAX_LINES } from "@/app/sites/amber/_data/cart";
import { normalizePhone } from "@/app/sites/amber/_data/member";
import { isShipKind, SHIP_KIND_ZH, cvsBrandName } from "@/app/sites/amber/_data/site";

// 下單。全系統價值最高的寫入：一次建立會員、訂單、逐行明細，並歸入結單。
//
// ⚠ 租戶由路徑常數決定，不看 Host。
// ⚠ 客戶端送來的任何金額欄位一律忽略——價格全部在伺服器重算。
// ⚠ 任何一行不能下單就整張拒絕並回報是哪幾行，**不做部分接受**：
//    部分接受等於收了跟客人螢幕上看到的不一樣的錢。

export const dynamic = "force-dynamic";

const TENANT = getTenant("amber")!;
const RATE = { windowMs: 10 * 60_000, max: 8 };

const Schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().max(40),
        optionId: z.string().max(40).nullable().optional(),
        qty: z.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(MAX_LINES),

  name: z.string().trim().min(1).max(60),
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  lineId: z.string().trim().max(60).optional().or(z.literal("")),

  shipKind: z.string().trim().max(10),
  recipient: z.string().trim().min(1).max(60),
  recipientPhone: z.string().trim().min(6).max(30),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  cvsBrand: z.string().trim().max(20).optional().or(z.literal("")),
  cvsStoreName: z.string().trim().max(80).optional().or(z.literal("")),
  cvsStoreId: z.string().trim().max(20).optional().or(z.literal("")),

  note: z.string().trim().max(1000).optional().or(z.literal("")),
  /** 冪等鍵：送出逾時重送不會變成兩張單 */
  clientRef: z.string().trim().max(64).optional(),
  /** 蜜罐。真人看不到這個欄位，填了就是機器人 */
  website: z.string().max(500).optional().or(z.literal("")),
});

const REASON_ZH: Record<string, string> = {
  expired: "已截止",
  "batch-closed": "本檔已收單",
  "not-live": "已下架",
  oos: "庫存不足",
  gone: "商品已移除",
};

export async function POST(req: NextRequest) {
  if (rateLimited(`order:${TENANT.slug}:${clientIp(req)}`, RATE)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  const input = parsed.data;

  // 蜜罐命中：回傳一個看起來成功的假結果，但什麼都不寫。
  // 直接回錯誤等於告訴機器人「這個欄位要留空」。
  if (input.website) {
    return NextResponse.json({ ok: true, id: "AM000000-0000" });
  }

  const phoneDigits = normalizePhone(input.phone);
  if (!phoneDigits) {
    return NextResponse.json({ error: "invalid phone", field: "phone" }, { status: 400 });
  }

  if (!isShipKind(input.shipKind)) {
    return NextResponse.json({ error: "invalid ship kind" }, { status: 400 });
  }
  if (input.shipKind === "home" && !input.address) {
    return NextResponse.json({ error: "address required", field: "address" }, { status: 400 });
  }
  if (input.shipKind === "cvs" && !input.cvsStoreName) {
    return NextResponse.json({ error: "store required", field: "cvsStoreName" }, { status: 400 });
  }

  const cart = normalizeCart(input.items);
  if (cart.length === 0) return NextResponse.json({ error: "empty cart" }, { status: 400 });

  // 先算一次，用來判斷檔期與產出通知信的內容。
  // 真正的權威判斷（截止、庫存）在 createDaigouOrder 的交易裡會再做一次——
  // 這中間有幾百毫秒，商品可能剛好截止或被別人買走最後一件。
  const snaps = await loadPricing(
    TENANT.slug,
    cart.map((l) => ({ productId: l.productId, optionId: l.optionId })),
  );
  const totals = priceLines(cart, snaps, new Date());

  if (totals.lines.length === 0) {
    return NextResponse.json(
      { error: "nothing orderable", rejected: totals.blocked.map((b) => ({ ...b, reasonZh: REASON_ZH[b.status] })) },
      { status: 400 },
    );
  }
  if (totals.blocked.length > 0) {
    return NextResponse.json(
      {
        error: "some lines unavailable",
        rejected: totals.blocked.map((b) => ({
          productId: b.productId,
          optionId: b.optionId,
          name: b.name,
          reason: b.status,
          reasonZh: REASON_ZH[b.status] ?? "無法下單",
        })),
      },
      { status: 409 },
    );
  }

  // 購物車跨檔期時不硬做。一張結單綁一個檔期（運費、預計到貨日都是檔期的），
  // 硬要合併會讓運費與到貨日說不清楚。實務上前台只列進行中的那一檔，
  // 會跨檔期通常是購物車裡有上一檔的殘留。
  const batchIds = [...new Set(snaps.map((s) => s.batchId))];
  if (batchIds.length !== 1) {
    return NextResponse.json({ error: "multiple batches" }, { status: 400 });
  }

  const member = await upsertMemberByPhone(TENANT.slug, phoneDigits, {
    name: input.name,
    email: input.email || null,
    lineId: input.lineId || null,
  });

  let order;
  try {
    order = await createDaigouOrder(TENANT.slug, {
      batchId: batchIds[0],
      memberId: member.id,
      lines: cart,
      ship: {
        kind: input.shipKind,
        recipient: input.recipient,
        phone: input.recipientPhone,
        address: input.address || null,
        cvsBrand: input.cvsBrand || null,
        cvsStoreName: input.cvsStoreName || null,
        cvsStoreId: input.cvsStoreId || null,
      },
      note: input.note || null,
      clientRef: input.clientRef ?? null,
    });
  } catch (e) {
    if (e instanceof OrderRejected) {
      // 交易裡的權威判斷擋下來了——通常是剛好在這幾百毫秒內截止，
      // 或最後一件被別人買走。回報是哪幾行，讓前台可以精準地標出來。
      return NextResponse.json(
        {
          error: "rejected",
          rejected: e.rejected.map((r) => ({ ...r, reasonZh: REASON_ZH[r.reason] ?? "無法下單" })),
        },
        { status: 409 },
      );
    }
    throw e;
  }

  // 資料庫寫入在前、寄信在後：SMTP 掛掉不能讓訂單消失。（同 REKAT）
  const origin = tenantOrigin(TENANT);
  const shipText =
    input.shipKind === "cvs"
      ? `${SHIP_KIND_ZH.cvs}｜${cvsBrandName(input.cvsBrand)} ${input.cvsStoreName ?? ""} ${input.cvsStoreId ?? ""}`
      : `${SHIP_KIND_ZH.home}｜${input.address ?? ""}`;

  await notifyTenant(TENANT, {
    subject: `新訂單 ${order.id}／${input.name}／${twd(totals.itemsTotal)}`,
    text: [
      `訂單編號：${order.id}`,
      `訂購人：${input.name}（${input.phone}）`,
      input.lineId ? `LINE：${input.lineId}` : null,
      "",
      ...totals.lines.map(
        (l) => `・${l.name}${l.optionLabel ? `（${l.optionLabel}）` : ""} ×${l.qty}　${twd(l.amount)}`,
      ),
      "",
      `商品小計：${twd(totals.itemsTotal)}（運費在結單時計算）`,
      `收件：${input.recipient} ${input.recipientPhone}`,
      shipText,
      input.note ? `備註：${input.note}` : null,
      "",
      `後台：${origin}/portal/amber`,
    ]
      .filter(Boolean)
      .join("\n"),
    replyTo: input.email || undefined,
  });

  // 「我的訂單」連結。客人拿它傳給自己或存進 LINE 記事本，之後不必記編號。
  // 連線期間下三次單就有三個訂單編號，一定會弄丟——這條連結取代那件事。
  const memberToken = await ensureMemberToken(TENANT.slug, member.id);

  return NextResponse.json({
    ok: true,
    id: order.id,
    itemsTotal: totals.itemsTotal,
    memberPath: memberToken ? `/me/${memberToken}` : null,
  });
}
