import type { NextRequest } from "next/server";

/**
 * 以「當前請求的 Host」組絕對網址。
 *
 * 不可用 NEXT_PUBLIC_SITE_URL —— 那是 Avalo 主站的網址，
 * 客戶在 wenshan.avalokite.xyz 登入後會被丟到 apex（既登出又看不到自己的站）。
 * （src/app/api/admin/login/route.ts 就是那樣寫的；單一 host 時無害，這裡不能照抄。）
 */
export function absoluteUrl(req: NextRequest, path: string): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "";
  return `${proto}://${host}${path}`;
}

/**
 * CSRF 防線：portal 的 cookie 用 sameSite:"lax"（客戶會從 LINE／Email 點連結進來，
 * "strict" 會讓跨站導航不帶 cookie、看起來像被登出），
 * 所以狀態變更的 POST 必須自行確認來源就是自己這個 origin。
 */
export function sameOrigin(req: NextRequest): boolean {
  const host = req.headers.get("host");
  if (!host) return false;
  const source = req.headers.get("origin") ?? req.headers.get("referer");
  if (!source) return false; // 表單送出一定會帶 origin；沒有就當可疑
  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}
