// 站台聯絡資訊 — Barry 上線前改這裡
export const SITE = {
  name: "Avalo 阿瓦羅",
  // Google Workspace 別名網域：avalokite.xyz 掛在 chaingull.com 的 Workspace 下，
  // 所以這個地址的信會直接進 service@chaingull.com 的同一個信箱。
  // 別名網域只會複製「現有帳號的名稱」，所以能用的是 service@ 而不是 hello@。
  email: "service@avalokite.xyz",
  lineId: "@avalo", // TODO: 換成正式 LINE 官方帳號 ID
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};
