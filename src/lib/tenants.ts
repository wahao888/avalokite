// 客戶站租戶登錄表 — 子網域路由、robots、通知收件人的唯一資料來源。
//
// 刻意不建 Prisma Tenant table：客戶站的頁面與樣式本來就住在程式碼裡、
// 本來就要重 build 才會變，多一份 DB 記錄只會產生第二個真實來源與「記得 seed」的步驟。
// Inquiry.tenantId 存的就是這裡的 slug（字串，非 FK）。

export type Tenant = {
  /** 子網域，同時是內部路徑 /sites/<slug>。只允許 a-z 0-9 與連字號 */
  slug: string;
  /** 客戶名稱，用於通知信顯示名與 admin 後台「來源」欄 */
  name: string;
  /** 客戶自有網域（不含 www）。設了就以它為正式 origin */
  domain?: string;
  /** false 時 robots.txt 全站 Disallow（尚未正式對外時用） */
  indexable: boolean;
  /** sitemap 用的路徑清單 */
  paths: string[];
  /** 表單通知收件人的環境變數名（值可為逗號分隔的多個信箱） */
  notifyEnv: string;
};

/** 客戶站掛載的主網域 */
export const BASE_DOMAIN = "avalokite.xyz";

/** 本機開發用的等效主網域：http://wenshan.localhost:3000 */
const DEV_DOMAINS = ["localhost", "lvh.me"];

export const TENANTS: Tenant[] = [
  {
    slug: "wenshan",
    name: "文山木材行",
    indexable: false,
    paths: ["/", "/products", "/quote"],
    notifyEnv: "TENANT_NOTIFY_WENSHAN",
  },
];

/**
 * 不可作為 slug 的字。涵蓋兩類：
 * ① 主站既有的頂層路由（萬一日後改回頂層掛載，避免撞名）
 * ② 基礎設施慣用子網域（www / mail / cdn…）
 */
export const RESERVED = [
  "www", "api", "admin", "portal", "mail", "demo", "static", "cdn", "assets",
  "cases", "legal", "cart", "checkout", "order", "sites", "zh-tw", "en",
];

const BY_SLUG = new Map(TENANTS.map((t) => [t.slug, t]));

export const getTenant = (slug: string | null | undefined): Tenant | null =>
  slug ? BY_SLUG.get(slug) ?? null : null;

// 錨定兩端，且 slug 不得以連字號開頭或結尾。
// 少了 ^ $ 會讓 wenshan.avalokite.xyz.evil.com 或 notwenshan.avalokite.xyz 被誤判為租戶。
const HOST_RE = new RegExp(
  `^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\\.(?:${[BASE_DOMAIN, ...DEV_DOMAINS]
    .map((d) => d.replace(/\./g, "\\."))
    .join("|")})$`
);

/**
 * 由 Host 標頭解析租戶。
 * apex（avalokite.xyz）、www、未登錄的子網域、以及任何外部網域一律回 null，
 * 讓呼叫端落回主站而不是導到不存在的 /sites/<未知>。
 */
export function tenantFromHost(hostHeader: string | null | undefined): Tenant | null {
  if (!hostHeader) return null;
  const host = hostHeader.trim().toLowerCase().split(":")[0];
  if (!host) return null;

  // 客戶自有網域優先於子網域
  const byDomain = TENANTS.find(
    (t) => t.domain && (host === t.domain || host === `www.${t.domain}`)
  );
  if (byDomain) return byDomain;

  const m = HOST_RE.exec(host);
  return m ? getTenant(m[1]) : null;
}

/** 該租戶對外的正式 origin：有自有網域就用它，否則用子網域 */
export const tenantOrigin = (t: Tenant): string =>
  t.domain ? `https://${t.domain}` : `https://${t.slug}.${BASE_DOMAIN}`;

/** 逐租戶產生 robots.txt；沒有這個的話子網域會吃到主站那份 */
export function robotsFor(t: Tenant): string {
  return t.indexable
    ? `User-agent: *\nAllow: /\nSitemap: ${tenantOrigin(t)}/sitemap.xml\n`
    : `User-agent: *\nDisallow: /\n`;
}
