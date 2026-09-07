import { NextRequest, NextResponse } from "next/server";

import { getTenantSession } from "@/lib/tenant-auth";
import { absoluteUrl, sameOrigin } from "@/lib/portal-http";
import {
  getBatch,
  listProducts,
  listOrders,
  upsertMemberByPhone,
  createDaigouOrder,
  OrderRejected,
} from "@/lib/daigou-data";
import { normalizePhone } from "@/app/sites/amber/_data/member";

// 代客下單。
//
// 她的老客人會繼續在 LINE 群組打「+1」——這幾乎必然。系統收不進來的話，
// 她就得同時維護 LINE 記事本與網站兩套帳，而**採購清單與結單金額就都會是錯的**，
// 整個系統的價值會漏光。所以這一支不是加分項。
//
// 代客下單刻意**不受收單截止限制**（她說收就收），並標記 source="manual"
// 讓她日後看得出哪些是代打的。

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Bad Request", { status: 400 });

  const tenant = await getTenantSession();
  if (!tenant) return new NextResponse("Unauthorized", { status: 401 });
  if (!tenant.daigou) return new NextResponse("Not Found", { status: 404 });

  const form = await req.formData();
  const batchId = String(form.get("batchId") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const phoneRaw = String(form.get("phone") ?? "").trim();

  const backTo = `/portal/amber/orders/new?batch=${encodeURIComponent(batchId)}`;
  const back = (error: string) =>
    NextResponse.redirect(absoluteUrl(req, `${backTo}&error=${error}`), 303);

  const batch = await getBatch(tenant.slug, batchId);
  if (!batch) return back("batch");

  const phoneDigits = normalizePhone(phoneRaw);
  if (!name || !phoneDigits) return back("who");

  // 只挑她真的填了數量的商品
  const products = await listProducts(tenant.slug, { batchId, take: 300 });
  const lines: { productId: string; optionId: string | null; qty: number }[] = [];
  for (const p of products) {
    if (p.options.length === 0) {
      const q = Number(String(form.get(`qty:${p.id}:`) ?? "").replace(/[^\d]/g, ""));
      if (Number.isFinite(q) && q > 0) lines.push({ productId: p.id, optionId: null, qty: q });
      continue;
    }
    for (const o of p.options) {
      const q = Number(String(form.get(`qty:${p.id}:${o.id}`) ?? "").replace(/[^\d]/g, ""));
      if (Number.isFinite(q) && q > 0) lines.push({ productId: p.id, optionId: o.id, qty: q });
    }
  }
  if (lines.length === 0) return back("empty");

  const member = await upsertMemberByPhone(tenant.slug, phoneDigits, {
    name,
    lineId: String(form.get("lineId") ?? "").trim() || null,
  });

  // 收件資料沿用這位客人上一筆訂單。她在群組 +1 的老客人通常寄同一個地方，
  // 每次都重問一次只會拖慢她。查不到就先留待確認，裝箱時再補。
  const previous = await listOrders(tenant.slug, { memberId: member.id, take: 1 });
  const last = previous[0];

  try {
    await createDaigouOrder(tenant.slug, {
      batchId,
      memberId: member.id,
      lines,
      ship: last
        ? {
            kind: last.shipKind,
            recipient: last.shipRecipient,
            phone: last.shipPhone,
            address: last.shipAddress,
            cvsBrand: last.shipCvsBrand,
            cvsStoreName: last.shipCvsStoreName,
            cvsStoreId: last.shipCvsStoreId,
          }
        : {
            kind: "cvs",
            recipient: name,
            phone: phoneDigits,
            cvsStoreName: "待確認",
          },
      note: String(form.get("note") ?? "").trim() || null,
      source: "manual",
      // 她說收就收——群組 +1 常常就是在截止之後才補進來的
      ignoreDeadline: true,
    });
  } catch (e) {
    if (e instanceof OrderRejected) return back("rejected");
    throw e;
  }

  return NextResponse.redirect(
    absoluteUrl(req, `/portal/amber/settlements?batch=${encodeURIComponent(batchId)}`),
    303,
  );
}
