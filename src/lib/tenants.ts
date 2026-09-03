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
  /**
   * 這個站對應的 Avalo 訂單編號（Order.id）。只用於欠費催收：
   * cron 抓到欠費訂閱時，要能在通知信裡指名「該暫停哪一個 slug」，
   * 否則站方收到的是一封還得自己回頭比對客戶名單的信。
   * 免費樣品站與尚未轉正的站留空。
   */
  orderId?: string;
  /**
   * true = 該站自己有 app/sites/<slug>/sitemap.ts，proxy 不代為產生。
   * 有動態子頁（口味、活動）的站需要這個——路徑清單住在站內的 _data，
   * 不該為了 sitemap 把它們拉進每個請求都會跑的 proxy bundle。
   */
  ownSitemap?: boolean;
  /** true = 後台多一頁「今日供應」，讓店家自己換每日口味（見 /portal/board） */
  flavorBoard?: boolean;
  /**
   * true = 該站有線上商店（購物車→訂單），後台多一區「訂單管理」（見 /portal/orders）。
   * 訂單落在 ShopOrder，tenantId 就是這裡的 slug。
   */
  shop?: boolean;
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
  {
    slug: "monsieurlong",
    name: "Monsieur Long 隆先生",
    indexable: false,
    // 靜態路徑僅供參考；實際 sitemap 由站內 sitemap.ts 產生（含口味與活動子頁）
    paths: ["/", "/flavors", "/events", "/collab", "/custom", "/store"],
    notifyEnv: "TENANT_NOTIFY_MONSIEURLONG",
    ownSitemap: true,
    flavorBoard: true,
  },
  {
    slug: "rekat",
    name: "REKAT ROASTERY 日卡地自然農莊",
    indexable: true,
    // 靜態路徑僅供參考；實際 sitemap 由站內 sitemap.ts 產生（含每一支豆子的單品頁）
    paths: ["/", "/beans", "/craft", "/about", "/cart", "/checkout"],
    notifyEnv: "TENANT_NOTIFY_REKAT",
    ownSitemap: true,
    shop: true,
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

/** 反查某張訂單對應的客戶站；沒有登錄 orderId 的站回 null */
export const tenantForOrder = (orderId: string): Tenant | null =>
  TENANTS.find((t) => t.orderId === orderId) ?? null;

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

/**
 * 逐租戶產生 sitemap.xml（來源是 Tenant.paths）。
 * 未對外的租戶回 null → proxy 回 404：robots 已經是 Disallow: /，
 * 再供一份 sitemap 等於自打嘴巴，也會把還沒上線的頁面送進搜尋引擎。
 * 客戶站不做多語系，所以不需要 hreflang。
 */
export function sitemapFor(t: Tenant): string | null {
  if (!t.indexable || t.ownSitemap) return null;
  const origin = tenantOrigin(t);
  const urls = t.paths
    .map((p) => `  <url><loc>${origin}${p === "/" ? "/" : p}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
