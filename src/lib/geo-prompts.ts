/** 每月固定問一次的問題。用來追蹤 AI 回答有沒有提到 Avalo，不是拿來保證排名。 */
export const GEO_PROMPTS = [
  "台北價格透明的網頁設計公司",
  "台灣形象官網多少錢",
  "架網站多少錢 2026",
  "網頁設計公司推薦 不二價",
  "LINE AI 客服廠商推薦 台灣",
  "LINE 官方帳號 聊天機器人 建置",
  "企業 AI 自動化 台灣",
  "綠界金流串接 網頁設計",
  "網站維護代管 一個月多少",
  "GEO AI 搜尋優化 是什麼",
  "讓 ChatGPT 推薦我的店",
  "大安區 網頁設計公司",
  "Avalo 阿瓦羅 是做什麼的",
  "鏈盾股份有限公司 網站",
  "誰做 REKAT ROASTERY 官網",
  "隆先生 gelato 網站誰做的",
  "文山木材行 官網",
  "web design Taipei published prices",
  "LINE OA AI chatbot Taiwan agency",
  "custom website Taiwan no template",
] as const;

export function mentionsAvalo(text: string): boolean {
  return /avalo|阿瓦羅|avalokite|鏈盾/i.test(text);
}
