import { NextRequest, NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant-auth";
import { allInquiriesForExport } from "@/lib/tenant-data";

/**
 * CSV 欄位轉義。
 *
 * 除了標準的引號處理，還要擋 CSV formula injection：Excel／Numbers 會把
 * 以 = + - @ 開頭的儲存格當公式執行（可被用來竊資料或執行指令），
 * 而這些欄位的內容全部來自表單提交者，是不可信輸入。前置單引號讓 Excel 視為文字。
 */
function cell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

const COLUMNS = [
  "編號", "狀態", "送出時間", "姓名", "電話", "Email",
  "場域／工程", "表單", "區域", "內容", "通知信已送達",
];

export async function GET(req: NextRequest) {
  const tenant = await getTenantSession();
  if (!tenant) return new NextResponse("Unauthorized", { status: 401 });

  const rows = await allInquiriesForExport(tenant.slug);
  const body = [
    COLUMNS.map(cell).join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.handled ? "已處理" : "未處理",
        r.createdAt.toISOString(),
        r.name,
        r.phone,
        r.email,
        r.company,
        r.service,
        r.budget,
        r.message,
        r.notified ? "是" : "否",
      ].map(cell).join(","),
    ),
  ].join("\r\n");

  // 檔名帶日期。不用 Date.now() 以外的格式化，避免時區困擾。
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(
    // BOM：沒有它 Excel 會用系統編碼開啟，中文全變亂碼
    "﻿" + body,
    {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${tenant.slug}-inquiries-${stamp}.csv"`,
        "cache-control": "no-store",
      },
    },
  );
}
