import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { tenantFromHost, getTenant, type Tenant } from "./tenants";

// 客戶後台（/portal）的登入狀態。
//
// 與 admin-auth.ts 分開的兩個理由：
// ① secret 不同 —— portal token 外洩不得換到 Avalo 後台權限。
// ② payload 帶 slug 且必須與 Host 相符 —— 這是租戶隔離的第一道防線。
//
// 為什麼後台掛在 <slug>.avalokite.xyz/portal 而不是 apex：
// 不帶 Domain 屬性的 cookie 是 host-only，瀏覽器「物理上」不會把
// wenshan.avalokite.xyz 的 session 送到別家的子網域。
// 於是隔離變成「瀏覽器保證 + 伺服器檢查」兩道獨立防線，而非只靠程式邏輯。

const COOKIE = "avalo_portal";
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 天：客戶不常來，8 小時會讓他每次都要重登

function secret(): string {
  const s = process.env.PORTAL_SESSION_SECRET;
  if (!s) throw new Error("PORTAL_SESSION_SECRET not set");
  return s;
}

const mac = (payload: string) =>
  crypto.createHmac("sha256", secret()).update(payload).digest("hex");

export function makePortalToken(slug: string): { token: string; maxAge: number } {
  const expiry = Date.now() + TTL_MS;
  const payload = `${slug}.${expiry}`;
  return { token: `${payload}.${mac(payload)}`, maxAge: TTL_MS / 1000 };
}

/**
 * 純函式版驗證，方便單元測試（不碰 next/headers）。
 * @param hostSlug 由 Host 解析出的租戶 slug
 * @returns token 有效且屬於該 host 的租戶時回 slug，否則 null
 */
export function verifyPortalToken(
  token: string | undefined | null,
  hostSlug: string | null,
): string | null {
  if (!token || !hostSlug) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [slug, expiryStr, sig] = parts;

  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || expiry <= 0 || expiry < Date.now()) return null;

  // 關鍵：token 裡的租戶必須等於網址上的租戶。
  // 少了這行，A 租戶的合法 token 就能拿去讀 B 租戶的資料。
  if (slug !== hostSlug) return null;

  const expected = mac(`${slug}.${expiry}`);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) {
      return null;
    }
  } catch {
    return null; // 長度不符等情況，timingSafeEqual 會丟例外
  }
  return slug;
}

/** 從當前請求的 Host 與 cookie 取得已登入的租戶；未登入或不相符回 null */
export async function getTenantSession(): Promise<Tenant | null> {
  const hostTenant = tenantFromHost((await headers()).get("host"));
  if (!hostTenant) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  return getTenant(verifyPortalToken(token, hostTenant.slug));
}

/** 由 Host 取得當前租戶（不論是否登入），用於渲染登入畫面的品牌 */
export async function getHostTenant(): Promise<Tenant | null> {
  return tenantFromHost((await headers()).get("host"));
}

/** 每個租戶一組密碼，存環境變數。改密碼只要 restart，不用重 build。 */
export const passwordEnvKey = (slug: string) =>
  `PORTAL_PW_${slug.toUpperCase().replace(/-/g, "_")}`;

export const PORTAL_COOKIE = COOKIE;
