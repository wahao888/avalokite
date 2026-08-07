import { describe, it, expect } from "vitest";
import { AGREED_DOCS, LEGAL, LEGAL_VERSION } from "../src/lib/legal-content";
import { LEGAL_ARCHIVE } from "../src/lib/legal-archive";
import { consentRecord, legalDocAt, legalHash } from "../src/lib/legal-consent";

// 這些測試守的是「舉證能力」：條款改了但沒封存、或雜湊算法變了，
// 都會讓既有訂單的同意紀錄失去意義——那正是爭議時唯一有用的東西。

describe("條款版本與封存", () => {
  it("版本號為日期格式（同日多改可加序號）", () => {
    expect(LEGAL_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}[a-z]?$/);
  });

  it("現行版本不在封存區（封存只放已被取代的版本）", () => {
    expect(LEGAL_ARCHIVE[LEGAL_VERSION]).toBeUndefined();
  });

  it("每個封存版本都含中英文的 terms 與 refund 全文", () => {
    for (const [version, byLocale] of Object.entries(LEGAL_ARCHIVE)) {
      for (const locale of ["zh-TW", "en"] as const) {
        for (const doc of AGREED_DOCS) {
          const d = byLocale[locale]?.[doc];
          expect(d, `${version}.${locale}.${doc} 缺漏`).toBeTruthy();
          expect(d.sections.length, `${version}.${locale}.${doc} 無內容`).toBeGreaterThan(0);
        }
      }
      // 封存版本必須算得出雜湊，否則訂單紀錄對不回原文
      expect(legalHash("zh-TW", version), `${version} 雜湊`).toMatch(/^[0-9a-f]{32}$/);
    }
  });

  it("結帳同意的文件是服務條款與退款政策", () => {
    expect([...AGREED_DOCS]).toEqual(["terms", "refund"]);
  });

  it("條款頁的 updated 與版本號一致（避免文件自稱沒改過）", () => {
    for (const doc of ["terms", "refund", "privacy"] as const) {
      for (const locale of ["zh-TW", "en"] as const) {
        expect(LEGAL[doc][locale].updated, `${doc}.${locale}`).toBe(LEGAL_VERSION);
      }
    }
  });
});

describe("內容雜湊", () => {
  it("為 32 字元十六進位，且中英文各自不同", () => {
    const zh = legalHash("zh-TW")!;
    const en = legalHash("en")!;
    expect(zh).toMatch(/^[0-9a-f]{32}$/);
    expect(en).toMatch(/^[0-9a-f]{32}$/);
    expect(zh).not.toBe(en); // 客戶讀的是哪個語言版本，證據就該是哪一份
  });

  it("同樣的內容算出同樣的值（可重複驗證）", () => {
    expect(legalHash("zh-TW")).toBe(legalHash("zh-TW"));
  });

  it("查不到的版本回 null，不會誤用現行內容充數", () => {
    expect(legalHash("zh-TW", "1999-01-01")).toBeNull();
    expect(legalDocAt("terms", "zh-TW", "1999-01-01")).toBeNull();
  });

  it("未指定版本時取現行版", () => {
    expect(legalDocAt("terms", "zh-TW")).toBe(LEGAL.terms["zh-TW"]);
    expect(legalDocAt("terms", "zh-TW", LEGAL_VERSION)).toBe(LEGAL.terms["zh-TW"]);
  });
});

describe("同意紀錄", () => {
  it("含版本、雜湊、時間與 IP", () => {
    const r = consentRecord("zh-TW", "203.0.113.9");
    expect(r.agreedTermsVersion).toBe(LEGAL_VERSION);
    expect(r.agreedTermsHash).toBe(legalHash("zh-TW"));
    expect(r.agreedIp).toBe("203.0.113.9");
    expect(r.agreedAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("英文客戶記錄的是英文版的雜湊", () => {
    expect(consentRecord("en", "1.1.1.1").agreedTermsHash).toBe(legalHash("en"));
  });

  it("IP 過長會截斷（避免偽造的標頭撐爆欄位）", () => {
    expect(consentRecord("zh-TW", "x".repeat(200)).agreedIp.length).toBe(60);
  });
});

describe("條款內容涵蓋關鍵約定", () => {
  const text = (locale: "zh-TW" | "en") =>
    AGREED_DOCS.flatMap((d) => LEGAL[d][locale].sections)
      .flatMap((s) => [s.h, ...s.body])
      .join("\n");

  it("中文條款寫明承諾期、原始碼歸屬、資料主權、管轄與消保法例外", () => {
    const t = text("zh-TW");
    for (const kw of [
      "最短承諾期",
      "12 個月",
      "著作財產權移轉予客戶",
      "共用元件",
      "CSV",
      "301 轉址",
      "臺灣臺北地方法院",
      "七日無條件解約",
      "責任",
    ]) {
      expect(t, `缺少「${kw}」`).toContain(kw);
    }
  });

  it("英文條款涵蓋同樣的要點", () => {
    const t = text("en");
    for (const kw of [
      "minimum term",
      "12-month",
      "Shared Components",
      "CSV",
      "301 redirect",
      "Taipei District Court",
      "7-day unconditional cancellation",
    ]) {
      expect(t, `missing "${kw}"`).toContain(kw);
    }
  });

  it("中英文條款的章節數一致（避免只改一邊）", () => {
    for (const doc of AGREED_DOCS) {
      expect(LEGAL[doc]["zh-TW"].sections.length, doc).toBe(LEGAL[doc].en.sections.length);
    }
  });
});

describe("封存機制演練（改條款的程序真的可行）", () => {
  it("把現行內容封存成舊版後，仍算得出當時的雜湊並查得回全文", () => {
    const before = legalHash("zh-TW")!;
    // 模擬 DEPLOY.md 的第 1 步：現行內容複製進封存區，掛在舊版本號下
    LEGAL_ARCHIVE["2026-07-01"] = {
      "zh-TW": { terms: LEGAL.terms["zh-TW"], refund: LEGAL.refund["zh-TW"] },
      en: { terms: LEGAL.terms.en, refund: LEGAL.refund.en },
    };
    try {
      // 封存版算出的雜湊要與封存當下的內容一致——訂單紀錄才對得回原文
      expect(legalHash("zh-TW", "2026-07-01")).toBe(before);
      expect(legalDocAt("terms", "zh-TW", "2026-07-01")?.sections.length).toBeGreaterThan(0);
      expect(legalDocAt("refund", "en", "2026-07-01")?.sections.length).toBeGreaterThan(0);
    } finally {
      delete LEGAL_ARCHIVE["2026-07-01"];
    }
  });
});
