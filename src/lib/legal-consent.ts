import crypto from "crypto";
import { AGREED_DOCS, LEGAL, LEGAL_VERSION, type LegalDoc } from "./legal-content";
import { LEGAL_ARCHIVE } from "./legal-archive";

// 契約同意的留證。爭議時要能回答三個問題：誰同意的、何時同意的、同意的內容是什麼。
// 前兩者存在訂單，第三者靠「版本號 + 內容雜湊」——雜湊一律由伺服器以自己的
// 條款內容計算，絕不接受前端傳來的值，否則等於讓對造自己決定證據長什麼樣。

export type ConsentLocale = "zh-TW" | "en";

const normalizeLocale = (locale: string): ConsentLocale =>
  locale === "en" ? "en" : "zh-TW";

/** 把文件攤平成穩定的字串再雜湊：改一個字就會變，但重新排版不會 */
function serialize(docs: LegalDoc[]): string {
  return docs
    .map((d) => d.sections.map((s) => `${s.h}\n${s.body.join("\n")}`).join("\n\n"))
    .join("\n\n----\n\n");
}

export function legalHash(locale: string, version = LEGAL_VERSION): string | null {
  const lc = normalizeLocale(locale);
  const docs =
    version === LEGAL_VERSION
      ? AGREED_DOCS.map((k) => LEGAL[k][lc])
      : LEGAL_ARCHIVE[version]
        ? AGREED_DOCS.map((k) => LEGAL_ARCHIVE[version][lc][k])
        : null;
  if (!docs) return null;
  return crypto.createHash("sha256").update(serialize(docs)).digest("hex").slice(0, 32);
}

/** 結帳當下要寫進訂單的同意紀錄 */
export function consentRecord(locale: string, ip: string) {
  return {
    agreedTermsVersion: LEGAL_VERSION,
    agreedTermsHash: legalHash(locale)!,
    agreedAt: new Date(),
    agreedIp: ip.slice(0, 60),
  };
}

/** 取某一版的條款全文（現行版或已封存版），供 /legal/[doc]?v= 與客訴查詢使用 */
export function legalDocAt(
  doc: (typeof AGREED_DOCS)[number] | "privacy",
  locale: string,
  version?: string
): LegalDoc | null {
  const lc = normalizeLocale(locale);
  if (!version || version === LEGAL_VERSION) return LEGAL[doc][lc];
  if (doc === "privacy") return null; // 隱私權非同意標的，不做版本封存
  return LEGAL_ARCHIVE[version]?.[lc]?.[doc] ?? null;
}
