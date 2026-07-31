import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "crypto";

const PORTAL_SECRET = "portal-secret-for-tests";
const ADMIN_SECRET = "admin-secret-for-tests";

async function fresh() {
  vi.resetModules();
  return import("../src/lib/tenant-auth");
}

beforeEach(() => {
  vi.stubEnv("PORTAL_SESSION_SECRET", PORTAL_SECRET);
  vi.stubEnv("ADMIN_SESSION_SECRET", ADMIN_SECRET);
});
afterEach(() => vi.unstubAllEnvs());

/** 用任意 secret 手工簽一個 token，用來模擬攻擊者 */
function forge(slug: string, expiry: number, secret: string) {
  const payload = `${slug}.${expiry}`;
  const mac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

const future = () => Date.now() + 60_000;

describe("verifyPortalToken — 正常路徑", () => {
  it("自家簽的 token 在自家 host 下通過", async () => {
    const { makePortalToken, verifyPortalToken } = await fresh();
    const { token } = makePortalToken("wenshan");
    expect(verifyPortalToken(token, "wenshan")).toBe("wenshan");
  });

  it("maxAge 為 7 天", async () => {
    const { makePortalToken } = await fresh();
    expect(makePortalToken("wenshan").maxAge).toBe(7 * 24 * 60 * 60);
  });
});

describe("verifyPortalToken — 租戶隔離（最關鍵的一條）", () => {
  it("A 租戶的合法 token 在 B 的 host 下必須失敗", async () => {
    const { makePortalToken, verifyPortalToken } = await fresh();
    const { token } = makePortalToken("wenshan");
    expect(verifyPortalToken(token, "otherclient")).toBeNull();
  });

  it("即使攻擊者知道 slug，也不能自己簽（沒有 secret）", async () => {
    const { verifyPortalToken } = await fresh();
    const bad = forge("wenshan", future(), "guessed-secret");
    expect(verifyPortalToken(bad, "wenshan")).toBeNull();
  });

  it("用 ADMIN_SESSION_SECRET 簽的 token 在 portal 無效（兩個 secret 確實分離）", async () => {
    const { verifyPortalToken } = await fresh();
    const adminSigned = forge("wenshan", future(), ADMIN_SECRET);
    expect(verifyPortalToken(adminSigned, "wenshan")).toBeNull();
  });

  it("改掉 payload 裡的 slug 會讓簽章對不上", async () => {
    const { makePortalToken, verifyPortalToken } = await fresh();
    const { token } = makePortalToken("wenshan");
    const [, expiry, sig] = token.split(".");
    expect(verifyPortalToken(`otherclient.${expiry}.${sig}`, "otherclient")).toBeNull();
  });
});

describe("verifyPortalToken — 格式與有效期", () => {
  it("過期的 token 失敗", async () => {
    const { verifyPortalToken } = await fresh();
    expect(verifyPortalToken(forge("wenshan", Date.now() - 1000, PORTAL_SECRET), "wenshan")).toBeNull();
  });

  it("竄改一個字元的簽章失敗", async () => {
    const { makePortalToken, verifyPortalToken } = await fresh();
    const { token } = makePortalToken("wenshan");
    const flipped = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    expect(verifyPortalToken(flipped, "wenshan")).toBeNull();
  });

  it.each([
    ["空字串", ""],
    ["undefined", undefined],
    ["null", null],
    ["少一段", "wenshan.123"],
    ["多一段", "wenshan.123.abc.def"],
    ["expiry 非數字", "wenshan.abc.def"],
    ["簽章非 hex", `wenshan.${Date.now() + 60000}.zzzz`],
    ["expiry 為 0", "wenshan.0.abc"],
  ])("格式異常：%s → null", async (_label, token) => {
    const { verifyPortalToken } = await fresh();
    expect(verifyPortalToken(token as string | undefined, "wenshan")).toBeNull();
  });

  it("hostSlug 為 null（未知子網域）時一律失敗", async () => {
    const { makePortalToken, verifyPortalToken } = await fresh();
    const { token } = makePortalToken("wenshan");
    expect(verifyPortalToken(token, null)).toBeNull();
  });

  it("未設定 PORTAL_SESSION_SECRET 時拋錯，不會靜默放行", async () => {
    vi.stubEnv("PORTAL_SESSION_SECRET", "");
    const { verifyPortalToken } = await fresh();
    expect(() => verifyPortalToken(forge("wenshan", future(), "x"), "wenshan")).toThrow();
  });
});

describe("passwordEnvKey", () => {
  it("slug 轉成合法的環境變數名", async () => {
    const { passwordEnvKey } = await fresh();
    expect(passwordEnvKey("wenshan")).toBe("PORTAL_PW_WENSHAN");
    expect(passwordEnvKey("wen-shan-2")).toBe("PORTAL_PW_WEN_SHAN_2");
  });
});
