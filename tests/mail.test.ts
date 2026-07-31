import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// 攔截 nodemailer，測試絕不真的送信
const sent: Record<string, unknown>[] = [];
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: async (opts: Record<string, unknown>) => {
        sent.push(opts);
        return { messageId: "test" };
      },
    }),
  },
}));

const TENANT = { slug: "wenshan", name: "文山木材行", notifyEnv: "TENANT_NOTIFY_WENSHAN" };

/** mail.ts 的節流閘是模組層狀態，每個測試都要拿到乾淨的模組 */
async function freshMail() {
  vi.resetModules();
  return import("../src/lib/mail");
}

beforeEach(() => {
  sent.length = 0;
  vi.stubEnv("SMTP_HOST", "smtp.example.com");
  vi.stubEnv("MAIL_FROM", "Avalo <no-reply@mail.avalokite.xyz>");
  vi.stubEnv("MAIL_OWNER", "owner@avalo.test");
});
afterEach(() => vi.unstubAllEnvs());

describe("sendMail 標頭安全", () => {
  it("主旨中的換行被清掉（擋 header injection）", async () => {
    const { sendMail } = await freshMail();
    await sendMail({
      to: "a@b.test",
      subject: "新單\r\nBcc: attacker@evil.com",
      text: "x",
    });
    // 關鍵是換行被清掉——注入的內容因此只是主旨裡的普通文字，無法變成獨立標頭
    expect(sent[0].subject).not.toMatch(/[\r\n]/);
    expect(sent[0].subject).toBe("新單 Bcc: attacker@evil.com");
    expect(sent[0].bcc).toBeUndefined();
  });

  it("fromName 只換顯示名，信封網域仍是我們自己的", async () => {
    const { sendMail } = await freshMail();
    await sendMail({ to: "a@b.test", subject: "s", text: "t", fromName: "文山木材行 官網表單" });
    expect(sent[0].from).toBe("文山木材行 官網表單 <no-reply@mail.avalokite.xyz>");
  });

  it("MAIL_FROM 是裸信箱時也能換顯示名", async () => {
    vi.stubEnv("MAIL_FROM", "no-reply@mail.avalokite.xyz");
    const { sendMail } = await freshMail();
    await sendMail({ to: "a@b.test", subject: "s", text: "t", fromName: "某某商行" });
    expect(sent[0].from).toBe("某某商行 <no-reply@mail.avalokite.xyz>");
  });

  it("SMTP 未設定時不寄信且回傳 false", async () => {
    vi.stubEnv("SMTP_HOST", "");
    const { sendMail } = await freshMail();
    expect(await sendMail({ to: "a@b.test", subject: "s", text: "t" })).toBe(false);
    expect(sent).toHaveLength(0);
  });
});

describe("notifyTenant 收件人與信譽", () => {
  it("寄給租戶收件人，Avalo 密件備份，Reply-To 指向提交者", async () => {
    vi.stubEnv("TENANT_NOTIFY_WENSHAN", "boss@wenshan.test");
    const { notifyTenant } = await freshMail();
    const ok = await notifyTenant(TENANT, {
      subject: "新估價單 #1",
      text: "內容",
      replyTo: "customer@example.com",
    });
    expect(ok).toBe(true);
    expect(sent[0].to).toBe("boss@wenshan.test");
    expect(sent[0].bcc).toBe("owner@avalo.test");
    expect(sent[0].replyTo).toBe("customer@example.com");
    // From 絕不能是提交者的網域，否則收件方 DMARC 對齊失敗
    expect(sent[0].from).toContain("mail.avalokite.xyz");
    expect(sent[0].from).not.toContain("example.com");
  });

  it("支援逗號分隔的多個收件人", async () => {
    vi.stubEnv("TENANT_NOTIFY_WENSHAN", "a@w.test, b@w.test ,c@w.test");
    const { notifyTenant } = await freshMail();
    await notifyTenant(TENANT, { subject: "s", text: "t" });
    expect(sent[0].to).toBe("a@w.test, b@w.test, c@w.test");
  });

  it("Reply-To 的換行同樣被清掉", async () => {
    vi.stubEnv("TENANT_NOTIFY_WENSHAN", "boss@wenshan.test");
    const { notifyTenant } = await freshMail();
    await notifyTenant(TENANT, {
      subject: "s",
      text: "t",
      replyTo: "x@y.test\r\nBcc: attacker@evil.com",
    });
    expect(String(sent[0].replyTo)).not.toMatch(/[\r\n]/);
  });

  it("未設定收件人時退回寄給 MAIL_OWNER，單子不會靜靜消失", async () => {
    vi.stubEnv("TENANT_NOTIFY_WENSHAN", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { notifyTenant } = await freshMail();
    const ok = await notifyTenant(TENANT, { subject: "s", text: "t" });
    expect(ok).toBe(true);
    expect(sent[0].to).toBe("owner@avalo.test");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("節流閘分艙", () => {
  it("某租戶被灌爆不影響其他租戶與主站", async () => {
    vi.stubEnv("TENANT_NOTIFY_WENSHAN", "boss@wenshan.test");
    vi.stubEnv("TENANT_NOTIFY_OTHER", "other@x.test");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { notifyTenant, notifyOwner } = await freshMail();

    // 灌爆 wenshan：30 封上限 + 1 封門檻告警 + 之後靜默丟棄
    for (let i = 0; i < 35; i++) {
      await notifyTenant(TENANT, { subject: `s${i}`, text: "t" });
    }
    const toWenshan = sent.filter((m) => m.to === "boss@wenshan.test").length;
    expect(toWenshan).toBe(31); // 30 封正常 + 1 封「已達上限」告警

    // 另一租戶與主站完全不受影響
    const other = { slug: "other", name: "另一家", notifyEnv: "TENANT_NOTIFY_OTHER" };
    expect(await notifyTenant(other, { subject: "s", text: "t" })).toBe(true);
    expect(await notifyOwner("主站詢問單", "t")).toBe(true);
    vi.restoreAllMocks();
  });
});
