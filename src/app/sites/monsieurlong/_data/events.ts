// Monsieur Long — 活動與合作
//
// 新增一場活動 = 加一筆。Upcoming / Past 由 end（或 start）自動分流，
// 不需要手動把資料從一個陣列搬到另一個陣列。
//
// ⚠️ 目前這三筆是由店家公開貼文整理的，內文為 Avalo 撰寫的初稿。
//    使用合作品牌名稱與識別前，請先確認已獲對方授權。

export type EventKind = "collab" | "market" | "popup" | "corporate" | "private";

export const EVENT_KIND_ZH: Record<EventKind, string> = {
  collab: "品牌聯名",
  market: "市集",
  popup: "快閃",
  corporate: "企業活動",
  private: "私人活動",
};

export type EventItem = {
  slug: string;
  title: string;
  titleEn?: string;
  kind: EventKind;
  /** 合作對象名稱；沒有就是自家活動 */
  partner?: string;
  /** ISO 日期。沒有就只用 dateLabel 顯示，並排在最後 */
  start?: string;
  end?: string;
  /** 對外顯示的日期字串，可以是「2025 夏」這種模糊寫法 */
  dateLabel: string;
  venue: string;
  city?: string;
  mapsUrl?: string;
  summary: string;
  body: string[];
  tags: string[];
  /** 該場活動的主色，用在卡片與詳頁的染色 */
  color: string;
  colorDeep: string;
  links?: { label: string; url: string }[];
  featured?: boolean;
};

const EVENTS: EventItem[] = [
  {
    slug: "creed-breeze-xinyi-night-2026",
    title: "CREED × Monsieur Long",
    titleEn: "BREEZE XINYI NIGHT 2026",
    kind: "collab",
    partner: "CREED",
    start: "2026-08-25",
    dateLabel: "2026 年 8 月",
    venue: "微風信義",
    city: "台北",
    summary: "香氣與 Gelato，用不同的方式留下味道與記憶。",
    body: [
      "微風信義之夜，我們把冰淇淋櫃搬進了香水的世界。",
      "香氣走的是鼻腔，Gelato 走的是舌頭，但它們做的其實是同一件事——把一個晚上變成之後會想起來的東西。",
      "謝謝這次的邀請與相遇，也謝謝每一位停下來品嚐的你們。",
    ],
    tags: ["精品聯名", "夜間活動", "現場供應"],
    color: "#1F1B16",
    colorDeep: "#0B0906",
    featured: true,
  },
  {
    slug: "dadaocheng-fireworks-final-2026",
    title: "大稻埕煙火節・最後一場",
    kind: "popup",
    start: "2026-08-15",
    dateLabel: "2026 年 8 月 15 日",
    venue: "大稻埕碼頭",
    city: "台北",
    summary: "冰淇淋、現爆爆米花，還有一整晚的音樂，一起等天黑。",
    body: [
      "夏天最後一場煙火，我們把攤子擺到河邊。",
      "18:30 開始放音樂，DJ 是開幕時陪我們一起玩的那一位。吃著冰、聽著歌，等天黑、等煙火升空。",
      "看完煙火也別急著回家，順路來吃杯冰，帶著甜甜的心情回去。",
    ],
    tags: ["市集擺攤", "現場 DJ", "河岸"],
    color: "#FFC732",
    colorDeep: "#8F5E00",
    featured: true,
  },
  {
    slug: "opening-party-2025",
    title: "開幕派對",
    kind: "popup",
    dateLabel: "2025",
    venue: "貴德街 59 號",
    city: "台北",
    summary: "一間新的冰店，在大稻埕的巷子裡開門的那天。",
    body: [
      "第一天，我們請了 DJ 來，把音樂放到街上。",
      "沒有人知道這條巷子裡會出現一間 Gelato 店，於是每個經過的人都停下來問了一次。",
      "那天之後，這裡就一直開著。",
    ],
    tags: ["開幕", "現場 DJ", "街區"],
    color: "#F0A028",
    colorDeep: "#B96A08",
  },
];

// ─────────────────────────────────────────────────────────────
// 查詢函式。與 flavors.ts 同一套規矩：頁面只呼叫函式。
// ─────────────────────────────────────────────────────────────

const endOf = (e: EventItem) => e.end ?? e.start;

const timeOf = (e: EventItem): number | null => {
  const iso = endOf(e);
  return iso ? new Date(`${iso}T23:59:59+08:00`).getTime() : null;
};

export function isUpcoming(e: EventItem, now = Date.now()): boolean {
  const t = timeOf(e);
  return t !== null && t >= now;
}

export async function listEvents(): Promise<EventItem[]> {
  return [...EVENTS];
}

export async function listUpcoming(now = Date.now()): Promise<EventItem[]> {
  return EVENTS.filter((e) => isUpcoming(e, now)).sort(
    (a, b) => (timeOf(a) ?? 0) - (timeOf(b) ?? 0),
  );
}

/** 已結束的活動＝品牌的作品集，最近的排前面；沒日期的排最後 */
export async function listPast(now = Date.now()): Promise<EventItem[]> {
  return EVENTS.filter((e) => !isUpcoming(e, now)).sort(
    (a, b) => (timeOf(b) ?? -Infinity) - (timeOf(a) ?? -Infinity),
  );
}

export async function getEvent(slug: string): Promise<EventItem | null> {
  return EVENTS.find((e) => e.slug === slug) ?? null;
}

export async function eventSlugs(): Promise<string[]> {
  return EVENTS.map((e) => e.slug);
}

/** 首頁只放精選；沒標 featured 就補最近的幾筆 */
export async function listFeatured(n = 3, now = Date.now()): Promise<EventItem[]> {
  const featured = EVENTS.filter((e) => e.featured);
  const rest = EVENTS.filter((e) => !e.featured).sort(
    (a, b) => (timeOf(b) ?? -Infinity) - (timeOf(a) ?? -Infinity),
  );
  void now;
  return [...featured, ...rest].slice(0, n);
}
