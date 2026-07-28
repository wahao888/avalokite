import createProxy from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createProxy(routing);

export const config = {
  // 排除 api、demo 示範站、wenshan 客戶站、Next 內部資源與靜態檔案（admin 走預設語系路由）
  matcher: "/((?!api|demo|wenshan|_next|_vercel|.*\\..*).*)",
};
