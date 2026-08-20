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

/**
 * 營運主體的登記資料。
 *
 * 綠界（ECPay）信用卡收款審核要求：銷售網頁上必須揭露與「賣家資料」完全相同的
 * 統編、地址、電話與 Email，否則審核不通過（2026-08-13 第一次被退就是這個原因）。
 * 因此下列每一個欄位都必須與綠界廠商專區「驗證/服務申請」填的字串一模一樣，
 * 只改單邊會讓下次審核再被退。資料來源：經濟部商工登記公示資料。
 *
 * 對外主要聯絡信箱仍是 SITE.email（品牌網域，與 registeredEmail 是同一個信箱）；
 * registeredEmail 只出現在頁尾的商家資訊，供金流與法遵查核比對。
 */
export const COMPANY = {
  legalName: "鏈盾股份有限公司",
  brand: SITE.name,
  taxId: "60543664",
  address: "臺北市大安區大安路一段191號6樓之1",
  phoneDisplay: "0961-187-792",
  phoneTel: "+886961187792",
  registeredEmail: "service@chaingull.com",
};
