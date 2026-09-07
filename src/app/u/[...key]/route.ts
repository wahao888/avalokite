import { NextResponse } from "next/server";
import { readFile } from "fs/promises";

import { resolveKeyPath } from "@/lib/storage/local-disk";

// 開發環境用的圖片服務。
//
// 正式站的 /u/ 由 nginx 的 location ^~ /u/ 直接送檔，**Node 完全看不到這些請求**
// （一台 t3.micro 沒有多餘的 CPU 拿去轉發靜態圖片）。本機沒有 nginx，
// 所以需要這個替身，否則後台的商品照全部是破圖。
//
// ⚠ 刻意只在 development 生效。
// 如果正式環境也讓它接手，nginx 那段設定漏掉時網站會「看起來正常」——
// 只是每一張圖都繞過 immutable 快取、多吃一次 Node 的記憶體，而且沒有人會發現。
// 寧可讓它在正式站大聲壞掉（404），照 DEPLOY.md 去補 nginx 設定。
//
// proxy.ts 的 matcher 排除帶副檔名的路徑，所以這條路由不會被改寫到 /sites/*。

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ key: string[] }> },
) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const { key } = await ctx.params;
  const joined = key.join("/");

  let file: Buffer;
  try {
    // resolveKeyPath 會驗證 key 的形狀並確認解析後的路徑真的落在根目錄底下，
    // 所以 ../ 那類把戲在這裡就被擋掉了。
    file = await readFile(resolveKeyPath(joined));
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "image/jpeg",
      // 開發時不要快取，改了圖立刻看得到
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
