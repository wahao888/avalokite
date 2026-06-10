import createProxy from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createProxy(routing);

export const config = {
  // 排除 api、Next 內部資源與靜態檔案（admin 走預設語系路由）
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
