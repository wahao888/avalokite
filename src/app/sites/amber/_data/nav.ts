// 站台導覽與賣點的單一真實來源。
//
// 同一份清單被三個地方用：桌機頁首、頁尾、首頁的服務特點區。
// 分開寫的話一定會有一天頁尾多了一頁而頁首沒有——那種不一致
// 是使用者唯一看得出來、而我們最不容易發現的錯。

export type NavLink = { href: string; label: string };

/** 桌機頁首的主導覽。手機版不顯示（見 amber.css 的 .am-nav__site） */
export const SITE_NAV: NavLink[] = [
  { href: "/lineups", label: "連線總覽" },
  { href: "/how", label: "購買流程" },
  { href: "/faq", label: "常見問題" },
  { href: "/about", label: "關於我們" },
];

/** 頁尾的說明頁。規範與隱私只在這裡出現，不佔頁首 */
export const FOOT_HELP: NavLink[] = [
  { href: "/how", label: "購買流程" },
  { href: "/faq", label: "常見問題" },
  { href: "/terms", label: "購買規範" },
  { href: "/privacy", label: "隱私權政策" },
];

export const FOOT_SHOP: NavLink[] = [
  { href: "/", label: "本檔商品" },
  { href: "/lineups", label: "連線總覽" },
  { href: "/cart", label: "購物車" },
  { href: "/order/lookup", label: "查訂單" },
];

/**
 * 服務特點。
 *
 * ⚠ 四點全部來自客戶自己的出貨說明（2026-09-07），**沒有一句是我們替她加的**。
 * 「正品」「預購制」「7-11 交貨便」是她的原話；「運費只收一次」是這套系統
 * 實際的行為（合併結單）。行銷文案寫得比實際做得到的多，第一個受害的是她。
 */
export const FEATURES = [
  {
    icon: "globe",
    title: "各國品牌直送",
    body: "韓國、日本、歐洲各地的品牌官網與實體門市，人在當地現場採買，不經第三方轉手。",
  },
  {
    icon: "shield",
    title: "正品代購",
    body: "只從品牌官網與正規門市購買。商品抵台後會先檢查再安排寄出。",
  },
  {
    icon: "tag",
    title: "價格上架就定案",
    body: "看到的台幣售價就是要付的金額，不再另外換算匯率或加收代購費。",
  },
  {
    icon: "box",
    title: "合併結單，運費收一次",
    body: "同一檔連線內下幾次單都會併成一張出貨單，運費只算一次；超商滿 3,500、宅配滿 5,000 免運。",
  },
] as const;

/** 手機版首頁那排小晶片。比 FEATURES 更短，因為它要能橫著擺 */
export const TRUST_CHIPS = [
  { icon: "globe", label: "各國正品代購" },
  { icon: "tag", label: "售價已含代購費" },
  { icon: "box", label: "合併結單運費一次" },
  { icon: "store", label: "超商 / 宅配" },
] as const;
