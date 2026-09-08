import type { ReactNode } from "react";

// AmberPick 的圖示。全部手繪，沒有圖示庫、沒有 emoji。
//
// 為什麼不用 emoji：同一個 emoji 在 iOS、Android、Windows 上是三張不同的圖，
// 大小、顏色、筆觸全都不受我們控制，而且它們一律是彩色的——深色模式一切、
// 一整排飽和的小圖案就會蓋過畫面上真正該被看見的東西（價格與倒數）。
// 一個要看起來專業的購物平台，不能把自己的識別交給使用者的作業系統。
//
// 規格（跟 Logo.tsx 的 AmberMark 同一組參數，所以擺在一起像同一支筆畫的）：
//   24×24 viewBox・fill=none・stroke=currentColor・stroke-width 1.6・圓端點
//
// 顏色一律走 currentColor：放在哪個字色裡就是哪個顏色，深淺切換自動跟上。

export type IconProps = {
  size?: number;
  /** 小尺寸時筆畫會太細，16px 以下建議 1.8～2 */
  stroke?: number;
  className?: string;
  /** 有意義的圖示才給（例如單獨當按鈕）；純裝飾的留空會自動 aria-hidden */
  title?: string;
};

function Svg({
  size = 20,
  stroke = 1.6,
  className,
  title,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ? `am-i ${className}` : "am-i"}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/* ── 介面 ─────────────────────────────────────────────── */

/** 購物袋。刻意用袋子不用推車——推車是超市，袋子才是選物店。 */
export const IconBag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.4 8.4h13.2l-1 11.1a1.6 1.6 0 0 1-1.6 1.5H8a1.6 1.6 0 0 1-1.6-1.5z" />
    <path d="M9 11V7.6a3 3 0 0 1 6 0V11" />
  </Svg>
);

export const IconSun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v1.8M12 19.2V21M3 12h1.8M19.2 12H21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M18.4 5.6l-1.3 1.3M6.9 17.1l-1.3 1.3" />
  </Svg>
);

export const IconMoon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 14.5A8.2 8.2 0 0 1 9.5 4 8.3 8.3 0 1 0 20 14.5z" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

export const IconCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2.2" />
    <path d="M15.4 5.6a1.6 1.6 0 0 0-1.6-1.6H6.6A2.6 2.6 0 0 0 4 6.6v7.2a1.6 1.6 0 0 0 1.6 1.6" />
  </Svg>
);

/** 紙飛機。分享到 LINE 用。 */
export const IconSend = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21.5 3.5 2.8 10.6l7.3 2.9 2.9 7.3z" />
    <path d="M21.5 3.5 10.1 13.5" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.5 5.5 16 12l-6.5 6.5" />
  </Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.5 9 12 15.5 18.5 9" />
  </Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </Svg>
);

export const IconMinus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.5 12h13" />
  </Svg>
);

/** 收據。查訂單、我的訂單。 */
export const IconReceipt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3.5h12v17l-2.4-1.5-2.4 1.5-2.4-1.5-2.4 1.5L6 20.5z" />
    <path d="M9.2 8.6h5.6M9.2 12.4h5.6" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10.8" cy="10.8" r="6.3" />
    <path d="m15.6 15.6 4 4" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 6.8v5.5l3.4 2" />
  </Svg>
);

export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11.2v5.2" />
    <path d="M12 7.8h.01" />
  </Svg>
);

export const IconQuestion = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.5 9.4a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.2-2.5 3.9" />
    <path d="M12 17.6h.01" />
  </Svg>
);

export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.6 21 19.4H3z" />
    <path d="M12 9.4v4.4" />
    <path d="M12 16.6h.01" />
  </Svg>
);

/* ── 服務與流程 ────────────────────────────────────────── */

/** 地球。各國連線。 */
export const IconGlobe = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.6 12h16.8" />
    {/* 經線用正圓的橢圓，不要手畫貝茲——手畫的那條在小尺寸會鼓成翅膀 */}
    <ellipse cx="12" cy="12" rx="4.1" ry="8.5" />
  </Svg>
);

/** 盾牌打勾。正品保證。 */
export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.8 19 5.4v6.1c0 4.5-2.9 8-7 9.7-4.1-1.7-7-5.2-7-9.7V5.4z" />
    <path d="m8.8 11.9 2.3 2.3 4.1-4.4" />
  </Svg>
);

/** 包裹。合併出貨。 */
export const IconBox = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.2 20 7.4v9.2L12 20.8 4 16.6V7.4z" />
    <path d="m4 7.4 8 4.2 8-4.2M12 11.6v9.2" />
  </Svg>
);

/** 超商。7-11 交貨便。 */
export const IconStore = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.4 9.6h15.2v10a1.2 1.2 0 0 1-1.2 1.2H5.6a1.2 1.2 0 0 1-1.2-1.2z" />
    <path d="M3.2 9.6 5 4.2h14l1.8 5.4" />
    <path d="M9.6 20.8v-5.4h4.8v5.4" />
  </Svg>
);

/** 價格標。透明報價。 */
export const IconTag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.5 3.5h-6.6a1.6 1.6 0 0 0-1.13.47l-8.4 8.4a1.6 1.6 0 0 0 0 2.26l5.5 5.5a1.6 1.6 0 0 0 2.26 0l8.4-8.4a1.6 1.6 0 0 0 .47-1.13z" />
    <circle cx="16.9" cy="7.1" r="1.35" />
  </Svg>
);

/** 對話。確認商品、LINE 客服。 */
export const IconChat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.5 11.6c0 4.1-3.8 7.5-8.5 7.5a10 10 0 0 1-2.4-.3l-5.1 1.7 1.3-3.4a7.2 7.2 0 0 1-2.3-5.5C3.5 7.5 7.3 4.1 12 4.1s8.5 3.4 8.5 7.5z" />
  </Svg>
);

/** 銀行。匯款。 */
export const IconBank = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.4 9.4 12 4.2l8.6 5.2" />
    <path d="M5.8 9.4v8.2M9.9 9.4v8.2M14.1 9.4v8.2M18.2 9.4v8.2" />
    <path d="M3.4 20.4h17.2" />
  </Svg>
);

/** 飛機（俯視）。空運寄回台灣。
    跟 IconSend 的紙飛機刻意不同——那一顆是「分享出去」，這一顆是「貨在飛」。 */
export const IconPlane = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.6c.9 0 1.6 1.5 1.6 3.4v2.3l7.2 4.3v2.1l-7.2-2.2v3.8l2.3 1.7v1.8L12 19.2l-3.9.8v-1.8l2.3-1.7v-3.8L3.2 14.7v-2.1l7.2-4.3V6c0-1.9.7-3.4 1.6-3.4z" />
  </Svg>
);

/** 貨車。宅配。 */
export const IconTruck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.8 6.4h10.6v10.2H2.8z" />
    <path d="M13.4 9.8h3.7l3.1 3.1v3.7h-6.8z" />
    <circle cx="7" cy="18.4" r="1.9" />
    <circle cx="16.6" cy="18.4" r="1.9" />
  </Svg>
);

/** 定位。超商門市。 */
export const IconPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21.2c3.6-4.1 6.2-7.2 6.2-10.4a6.2 6.2 0 1 0-12.4 0c0 3.2 2.6 6.3 6.2 10.4z" />
    <circle cx="12" cy="10.6" r="2.4" />
  </Svg>
);

export const IconPhone = (p: IconProps) => (
  <Svg {...p}>
    <rect x="6.6" y="2.8" width="10.8" height="18.4" rx="2.4" />
    <path d="M10.8 18.2h2.4" />
  </Svg>
);

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.8" y="10.4" width="14.4" height="10.2" rx="2.2" />
    <path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6" />
  </Svg>
);

/** 文件。購買規範。 */
export const IconDoc = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13.9 3.2H7.6a1.4 1.4 0 0 0-1.4 1.4v14.8a1.4 1.4 0 0 0 1.4 1.4h8.8a1.4 1.4 0 0 0 1.4-1.4V7.1z" />
    <path d="M13.9 3.2v3.9h3.9" />
    <path d="M9.2 12.4h5.6M9.2 15.8h3.8" />
  </Svg>
);

/** 日曆。連線總覽。 */
export const IconCalendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.6" y="5.4" width="16.8" height="15.2" rx="2.2" />
    <path d="M3.6 10.2h16.8M8.4 3.4v3.6M15.6 3.4v3.6" />
  </Svg>
);

export const IconHeart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20.4C12 20.4 3.8 15.5 3.8 9.9A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 8.2 2.5c0 5.6-8.2 10.5-8.2 10.5z" />
  </Svg>
);

/** 小星芒。裝飾用，不承載意思。 */
export const IconSparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.4c0 4.8 1.4 6.2 6.2 6.2-4.8 0-6.2 1.4-6.2 6.2 0-4.8-1.4-6.2-6.2-6.2 4.8 0 6.2-1.4 6.2-6.2z" />
    <path d="M18.4 15.2c0 2.4.7 3.1 3.1 3.1-2.4 0-3.1.7-3.1 3.1 0-2.4-.7-3.1-3.1-3.1 2.4 0 3.1-.7 3.1-3.1z" />
  </Svg>
);

/* ── 商品分類 ──────────────────────────────────────────── */

export const IconDress = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.2 3.4 12 5.5l2.8-2.1 1.9 1.4-2.3 3.5 2.9 10.4a1 1 0 0 1-1 1.3H7.7a1 1 0 0 1-1-1.3l2.9-10.4-2.3-3.5z" />
  </Svg>
);

export const IconShirt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8.6 3.5 12 5.5l3.4-2 4.1 2.3-1.8 3.6-1.7-.9v8.8a1.2 1.2 0 0 1-1.2 1.2H9.2A1.2 1.2 0 0 1 8 17.3V8.5l-1.7.9-1.8-3.6z" />
  </Svg>
);

export const IconShoe = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 15.6v-5.1h2.7l2.6 2.4 4.7 1c2.8.6 5.2 1.2 6.4 2.1.6.4.9 1 .9 1.7v1.8H3.5z" />
    <path d="M6.2 10.5v2.6" />
  </Svg>
);

/** 手錶。配件。
    原本畫的是戒指（圓環＋上方兩條斜線），但那兩條線收在一個點上，
    小尺寸看起來是一滴水。手錶的錶帶是兩段矩形，不會被誤讀。 */
export const IconWatch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4.6" />
    <path d="M9 7.7 9.4 3.4h5.2L15 7.7" />
    <path d="M9 16.3l.4 4.3h5.2l.4-4.3" />
  </Svg>
);

export const IconBottle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.1 3.4h3.8v2.7l2.1 2.4v10.3a1.2 1.2 0 0 1-1.2 1.2H9.2A1.2 1.2 0 0 1 8 18.8V8.5l2.1-2.4z" />
    <path d="M8 12.2h8" />
  </Svg>
);

export const IconCup = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.6 9.2h11.8v6.9a4.4 4.4 0 0 1-4.4 4.4H9a4.4 4.4 0 0 1-4.4-4.4z" />
    <path d="M16.4 11.2h1.5a2.6 2.6 0 0 1 0 5.2h-1.5" />
    <path d="M8.4 6.2V4.1M12.4 6.2V4.1" />
  </Svg>
);

/* ── 分類 → 圖示 ───────────────────────────────────────── */

/**
 * 分類的圖示表。key 對照 _data/categories.ts。
 *
 * 認不得的 key 回 IconBag（同 categoryName 的「未分類」策略）——
 * 髒資料不該讓一整排分類少一個圖示、對不齊。
 */
const CATEGORY_ICONS: Record<string, (p: IconProps) => ReactNode> = {
  women: IconDress,
  men: IconShirt,
  shoes: IconShoe,
  accessory: IconWatch,
  beauty: IconBottle,
  food: IconCup,
  instock: IconBox,
};

export function CategoryIcon({
  categoryKey,
  ...rest
}: IconProps & { categoryKey: string | null | undefined }) {
  const C = (categoryKey && CATEGORY_ICONS[categoryKey]) || IconBag;
  return <>{C(rest)}</>;
}

/* ── 名稱 → 圖示 ───────────────────────────────────────
   _data/nav.ts 那些純資料的清單只能存字串（它們要能被測試、被別處引用，
   不該相依於 React）。這張表把字串接回元件。 */

const BY_NAME: Record<string, (p: IconProps) => ReactNode> = {
  globe: IconGlobe,
  shield: IconShield,
  tag: IconTag,
  box: IconBox,
  store: IconStore,
  truck: IconTruck,
  chat: IconChat,
  bank: IconBank,
  bag: IconBag,
  plane: IconPlane,
  clock: IconClock,
  check: IconCheck,
  receipt: IconReceipt,
  pin: IconPin,
  doc: IconDoc,
  lock: IconLock,
  calendar: IconCalendar,
  heart: IconHeart,
  sparkle: IconSparkle,
  info: IconInfo,
};

export function NamedIcon({ name, ...rest }: IconProps & { name: string }) {
  const C = BY_NAME[name] ?? IconSparkle;
  return <>{C(rest)}</>;
}
