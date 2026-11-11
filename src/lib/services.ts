// 服務頁（/services/<slug>）的內容。
//
// 價格一律寫成記號，由 fill() 從 products.ts 帶入，不手抄數字：
//   {price:<sku>}  方案價（例：{price:web-basic} → NT$39,000）
//   {addon:<id>}   單項功能參考價（ADDONS 的 id）
//   {line}         LINE 官方帳號 ID
// 記號對不到商品時 fill() 直接丟錯，讓 build 失敗——寧可部署不出去，
// 也不要讓頁面掛著一個不存在的方案或過期的價格（tests/services.test.ts 另有把關）。
//
// 文案只寫得出處的事：方案內容取自 products.ts、交期與流程取自 ai-knowledge.ts
// 的 HANDBOOK、案例細節取自各案例頁。沒有來源的承諾（保證排名、保證交期）不寫。
import { ADDONS, fmt, getProduct } from "@/lib/products";
import { SITE } from "@/lib/site";

type Loc = "zh-TW" | "en";

export interface ServiceCopy {
  name: string; // 頁尾、麵包屑、其他服務列表用的短名
  title: string; // <title>
  description: string;
  label: string;
  h1: string;
  lede: string;
  fit: string[];
  points: { t: string; d: string }[];
  timeline?: string;
  faq: { q: string; a: string }[];
}

export interface Service {
  slug: string;
  serviceType: string; // schema.org 的 serviceType
  skus: string[]; // 方案卡
  addons: string[]; // 可加購的單項功能
  cases: string[]; // 相關案例的路徑
  i18n: Record<Loc, ServiceCopy>;
}

export function fill(text: string): string {
  return text
    .replace(/\{price:([a-z0-9-]+)\}/g, (_, sku: string) => {
      const p = getProduct(sku);
      if (!p) throw new Error(`services.ts 引用了不存在的方案：${sku}`);
      return `NT$${fmt(p.price)}`;
    })
    .replace(/\{addon:([a-z0-9-]+)\}/g, (_, id: string) => {
      const a = ADDONS.find((x) => x.id === id);
      if (!a) throw new Error(`services.ts 引用了不存在的單項功能：${id}`);
      return `NT$${fmt(a.price)}`;
    })
    .replace(/\{line\}/g, SITE.lineId);
}

export const SERVICES: Service[] = [
  {
    slug: "website",
    serviceType: "Web design",
    skus: ["web-basic"],
    addons: ["domain", "i18n", "booking", "seo-starter"],
    cases: ["/cases/monsieurlong", "/cases/wenshan", "/cases/gtclub"],
    i18n: {
      "zh-TW": {
        name: "形象官網設計",
        title: "網頁設計・形象官網 {price:web-basic} 起｜價格全公開｜Avalo 阿瓦羅",
        description:
          "全客製形象官網，5 頁以內 {price:web-basic}（未稅）起：RWD 響應式、SEO 基礎與 GA4、聯絡表單與 LINE 導流，含部署上線。約 2–3 週交付，價格公開不二價，可線上直接下單。",
        label: "網頁設計・形象官網",
        h1: "形象官網設計，{price:web-basic} 起，\n價格先講清楚",
        lede: "形象官網是客人認識你的第一站，也是他決定要不要聯絡你的地方。Avalo 的形象官網全客製設計、不套版，5 頁以內 {price:web-basic}（未稅）起，從設計、開發到部署上線一手包辦；上線之後由維護方案接手主機、備份與更新，不會做完就沒人管。",
        fit: [
          "剛創業或剛成立工作室，需要一個拿得出手的正式門面",
          "有實體店面，希望客人在 Google 與 LINE 上找得到、看得懂你",
          "舊官網年久失修、手機版跑版，想一次重做到位",
          "顧問、設計、教育等專業服務，需要把服務內容、作品與聯絡方式講清楚",
        ],
        points: [
          { t: "全客製，不套版", d: "版面依你的品牌、內容量與客人的閱讀習慣設計，不是把文字塞進現成模板。" },
          { t: "手機優先", d: "多數訪客用手機看網站，版面、字級與按鈕先為手機設計，再延伸到平板與桌機。" },
          { t: "SEO 基礎與 GA4", d: "頁面標題與描述、sitemap、結構化資料與 GA4 安裝，上線第一天就讓搜尋引擎讀得懂，你也看得到流量。" },
          { t: "聯絡表單＋LINE 導流", d: "詢問直接寄進你的信箱；習慣用 LINE 的客人一鍵加好友，不必再抄 ID。" },
          { t: "速度是設計的一部分", d: "圖片與字型都算進載入預算。中文網路字型是常見的元兇——我們實測過，一個常見設定就能讓手機首頁多載 1MB 以上。" },
          { t: "網域登記在你名下", d: "自有網域可代為申請與設定（{addon:domain}），登記人一律是你，日後要搬家也不受綁架。" },
        ],
        timeline: "約 2–3 週，自素材（文案、圖片）齊備起算。",
        faq: [
          {
            q: "5 頁不夠怎麼辦？",
            a: "常見的配置是首頁、關於、服務、作品、聯絡五頁。需要更多頁面或功能，可以加購單項功能（例如多語系 {addon:i18n} 起、線上預約 {addon:booking} 起），或直接選商務網站方案；超出標準範圍的部分，諮詢後提供書面固定報價，報價後一樣不二價。",
          },
          {
            q: "上線之後可以自己改內容嗎？",
            a: "維護方案內含修改額度：安心維護每月 2 次小幅修改，成長維護每月 4 小時。如果內容天天在變，可以加做專屬後台——隆先生的「今日口味」就是店家每天用手機勾選，官網立刻跟著換。",
          },
          {
            q: "為什麼不用套版平台就好？",
            a: "套版平台適合預算有限、想自己動手的人。如果你需要依品牌量身設計、速度與 SEO 有人負責、上線後有人維護的網站，那就是形象官網方案在做的事。",
          },
          {
            q: "除了建置費，還要付什麼？",
            a: "建置案須搭配一份維護方案，形象官網建議搭配安心維護 {price:care-basic}／月（主機、SSL、每日備份、安全更新），自網站上線驗收後才開始計費，最短承諾 12 個月，期滿後可隨時終止。標價皆未稅，結帳加 5% 營業稅。",
          },
        ],
      },
      en: {
        name: "Brand Website Design",
        title: "Web Design Taiwan | Brand Websites from {price:web-basic} | Avalo",
        description:
          "Fully custom brand websites (up to 5 pages) from {price:web-basic} excl. VAT: responsive design, SEO foundation and GA4, contact form and LINE integration, deployment included. Delivered in about 2–3 weeks. Published prices, order online.",
        label: "Web design · Brand websites",
        h1: "Brand website design\nfrom {price:web-basic}, priced up front",
        lede: "Your website is where customers first meet you — and where they decide whether to get in touch. Avalo builds fully custom brand sites, no templates, from {price:web-basic} (excl. VAT) for up to five pages, covering design, development and deployment. After launch a care plan takes over hosting, backups and updates, so the site is never left unattended.",
        fit: [
          "New businesses and studios that need a credible home on the web",
          "Local shops that want to be found — and understood — on Google and LINE",
          "Companies whose old site is outdated or broken on mobile",
          "Consultants, designers and educators who need services, work and contact details made clear",
        ],
        points: [
          { t: "Custom, never a template", d: "Layouts are designed around your brand, your content and how your customers read — not text poured into a stock theme." },
          { t: "Mobile first", d: "Most visitors arrive on a phone, so layout, type and buttons are designed for mobile first, then scaled up." },
          { t: "SEO foundation and GA4", d: "Titles and descriptions, sitemap, structured data and GA4, so search engines understand the site — and you can see the traffic — from day one." },
          { t: "Contact form + LINE", d: "Enquiries land straight in your inbox; customers who prefer LINE can add you as a friend in one tap." },
          { t: "Speed is part of the design", d: "Images and fonts count against a loading budget. Chinese web fonts are a common culprit — we have measured one common setup adding over 1MB to a mobile home page." },
          { t: "Your domain, in your name", d: "We can register and configure your own domain ({addon:domain}) — always in your name, so you are never locked in." },
        ],
        timeline: "About 2–3 weeks, counted from when your copy and images are ready.",
        faq: [
          {
            q: "What if five pages aren't enough?",
            a: "A typical setup is Home, About, Services, Work and Contact. For more pages or features, add à la carte items (e.g. multilingual from {addon:i18n}, online booking from {addon:booking}) or choose the Commerce Website plan. Anything beyond the standard scope gets a fixed written quote after a consultation — and that quote is not negotiated either.",
          },
          {
            q: "Can I edit the content myself after launch?",
            a: "Care plans include edits: two small edits a month on Essential Care, four hours a month on Growth Care. If your content changes daily, we can build a dashboard for it — Monsieur Long updates its flavours of the day from a phone and the site changes instantly.",
          },
          {
            q: "Why not just use a website builder?",
            a: "Builders suit tight budgets and people who want to do it themselves. If you need a site designed around your brand, with someone responsible for speed and SEO and someone maintaining it after launch, that is what this plan is for.",
          },
          {
            q: "What do I pay besides the build fee?",
            a: "Every build comes with a care plan; for a brand site we recommend Essential Care at {price:care-basic}/month (hosting, SSL, daily backups, security updates). Billing starts only after launch and acceptance, with a 12-month minimum term, cancellable any time after. Prices exclude 5% VAT.",
          },
        ],
      },
    },
  },
  {
    slug: "ecommerce",
    serviceType: "E-commerce website development",
    skus: ["web-commerce"],
    addons: ["einvoice", "membership", "booking"],
    cases: ["/cases/rekat"],
    i18n: {
      "zh-TW": {
        name: "電商網站架設",
        title: "電商網站架設・購物網站 {price:web-commerce} 起｜綠界金流・定期定額｜Avalo 阿瓦羅",
        description:
          "可以收錢的網站：購物車或線上預約、綠界／藍新金流（含定期定額）、訂單管理後台，{price:web-commerce}（未稅）起，含部署上線。約 3–5 週交付，價格公開，可線上直接下單。",
        label: "電商網站・預約網站",
        h1: "電商網站架設：\n購物車、金流、後台一次到位",
        lede: "會收錢的網站，難的不是把商品放上去，而是付款、訂單、對帳每一步都不能錯。Avalo 的商務網站方案 {price:web-commerce}（未稅）起，包含購物車或預約系統、綠界／藍新金流（含定期定額）與訂單管理後台。你現在看的這個網站就是同一套做法：方案加入購物車、綠界刷卡、月費自動扣款，全部自建。",
        fit: [
          "在 IG、LINE 私訊接單，想改成客人自己下單、自動收款的品牌",
          "課程、美業、顧問等需要線上預約的服務業",
          "要賣訂閱、月費或定期配送的商品",
          "不想被電商平台抽成，想把客人資料留在自己手上的店家",
        ],
        points: [
          { t: "購物車或預約系統", d: "依你的生意型態規劃：賣商品用購物車，賣時段用預約，流程照客人實際的下單習慣設計。" },
          { t: "綠界／藍新金流", d: "信用卡一次付清與定期定額都能串；付款結果以金流商的檢查碼（CheckMacValue）驗章為準，不只看瀏覽器回傳。" },
          { t: "金額只有一個真實來源", d: "價格由伺服器重新計算，購物車只存品項與數量；前端送來的任何金額一律不採信，改 devtools 拿不到便宜。" },
          { t: "訂單管理後台", d: "訂單與付款狀態集中在一個後台；售完、下架由你自己操作，客人結帳時後端會再擋一次。" },
          { t: "定期定額與扣款失敗", d: "月費、訂閱走信用卡定期定額；扣款失敗時分階段寄出通知，不會默默斷掉——我們自己的月費就是這樣收的。" },
          { t: "電子發票可選", d: "需要自動開立、作廢、寄送電子發票，可加購串接（{addon:einvoice} 起）。" },
        ],
        timeline: "約 3–5 週，自素材（商品資料、圖片、文案）齊備起算。",
        faq: [
          {
            q: "購物車和預約可以都要嗎？",
            a: "可以。方案內含購物車或預約系統，依你的生意型態規劃；兩者都要、或還需要會員制度（{addon:membership} 起），諮詢後一起提供書面報價。",
          },
          {
            q: "刷卡資料會經過我的網站嗎？",
            a: "不會。卡號在綠界的安全付款頁輸入，你的網站不經手、也不儲存任何卡號。",
          },
          {
            q: "已經有網站，只想加購物車或金流可以嗎？",
            a: "可以。金流串接可以單獨加購（{addon:payment} 起），實際報價依你現有網站的架構，於諮詢時確認。",
          },
          {
            q: "除了建置費，還要付什麼？",
            a: "建置案須搭配一份維護方案，商務網站建議搭配成長維護 {price:care-growth}／月（含每月 4 小時修改與 SEO＋GEO 調整），自網站上線驗收後才開始計費，最短承諾 12 個月。金流商的交易手續費，依你與金流商簽訂的費率另計。",
          },
        ],
      },
      en: {
        name: "E-commerce Websites",
        title: "E-commerce Website Development | from {price:web-commerce} with ECPay | Avalo",
        description:
          "A website that takes payments: cart or online booking, ECPay / NewebPay (incl. recurring billing) and an order dashboard, from {price:web-commerce} excl. VAT, deployment included. Delivered in about 3–5 weeks.",
        label: "E-commerce · Booking sites",
        h1: "E-commerce websites:\ncart, payments and admin in one build",
        lede: "The hard part of a site that takes money isn't listing products — it's that payment, orders and reconciliation can't go wrong at any step. Avalo's Commerce Website plan starts at {price:web-commerce} (excl. VAT) and includes a cart or booking system, ECPay / NewebPay payments with recurring billing, and an order dashboard. The site you are reading works the same way: add a plan to the cart, pay by card through ECPay, monthly fees charged automatically — all built in-house.",
        fit: [
          "Brands taking orders by Instagram or LINE message who want customers to check out on their own",
          "Classes, salons and consultants that need online booking",
          "Subscriptions, memberships and scheduled deliveries",
          "Shops that would rather not pay marketplace commission and want to keep their customer data",
        ],
        points: [
          { t: "Cart or booking", d: "Planned around your business: a cart for products, booking for time slots, with the flow shaped by how your customers actually buy." },
          { t: "ECPay / NewebPay", d: "One-off card payments and recurring billing. A payment counts only when the gateway's CheckMacValue signature verifies — never on the browser's word alone." },
          { t: "One source of truth for money", d: "The server recomputes every price; the cart stores items and quantities only. Any amount sent by the browser is ignored, so tampering in devtools gets you nothing." },
          { t: "Order dashboard", d: "Orders and payment status in one place. You mark items sold out or delisted yourself, and checkout enforces it again on the server." },
          { t: "Recurring billing and failed payments", d: "Subscriptions run on card recurring billing; failed charges trigger staged reminders instead of silently lapsing — it's how we bill our own care plans." },
          { t: "Optional e-invoices", d: "Automatic issuing, voiding and sending of Taiwan e-invoices is available as an add-on (from {addon:einvoice})." },
        ],
        timeline: "About 3–5 weeks, counted from when product data, images and copy are ready.",
        faq: [
          {
            q: "Can I have both a cart and booking?",
            a: "Yes. The plan includes a cart or a booking system planned around your business; if you need both, or membership accounts as well (from {addon:membership}), we quote it in writing after a consultation.",
          },
          {
            q: "Do card details pass through my website?",
            a: "No. Card numbers are entered on ECPay's secure payment page; your site never handles or stores them.",
          },
          {
            q: "I already have a website. Can you just add payments?",
            a: "Yes. Payment integration is available on its own (from {addon:payment}); the final quote depends on how your current site is built and is confirmed during the consultation.",
          },
          {
            q: "What do I pay besides the build fee?",
            a: "Every build comes with a care plan; for a commerce site we recommend Growth Care at {price:care-growth}/month (four hours of changes a month plus SEO and GEO tuning). Billing starts after launch and acceptance, with a 12-month minimum term. Gateway transaction fees are charged separately at the rate you agree with the payment provider.",
          },
        ],
      },
    },
  },
  {
    slug: "line-ai-chatbot",
    serviceType: "AI customer service chatbot",
    // 三階都列進來：JSON-LD 的 offers 會逐階輸出，搜尋結果才顯示得出價格區間
    skus: ["ai-chatbot-lite", "ai-chatbot", "ai-chatbot-enterprise"],
    addons: ["rag"],
    cases: ["/cases/agagent"],
    i18n: {
      "zh-TW": {
        name: "LINE AI 客服",
        title: "LINE AI 客服・聊天機器人建置 {price:ai-chatbot} 起｜用你的資料回答｜Avalo 阿瓦羅",
        description:
          "LINE 官方帳號＋網站雙通道 AI 客服：以你的 FAQ 與文件建立知識庫（RAG）、真人轉接與對話紀錄後台，{price:ai-chatbot}（未稅）起，含部署與知識庫首次建置，約 2–3 週上線。",
        label: "LINE AI 客服・智能客服",
        h1: "LINE AI 客服：\n用你的資料，回答客人的問題",
        lede: "營業時間、價格、方案差異、怎麼付款——客服每天回答的，多半是同樣的幾十個問題。Avalo 的 AI 客服接在 LINE 官方帳號與網站上，用你的 FAQ、價目與文件建立知識庫來回答；需要真人的時候，就交給你。{price:ai-chatbot}（未稅）起，含部署上線與知識庫首次建置。",
        fit: [
          "LINE 官方帳號訊息多到回不完，或下班後沒人回",
          "同樣的問題每天要回答幾十次的客服與業務",
          "方案、價格、規格複雜，客人常問錯、你常解釋的服務業",
          "想試 AI 客服，但擔心它亂報價、亂承諾的企業",
        ],
        points: [
          { t: "知識庫用你的資料", d: "FAQ、價目表、服務說明與文件，整理成 AI 查得到的知識庫（RAG），回答有根據，不靠模型自己想像。" },
          { t: "數字不讓 AI 自己算", d: "價格與方案由系統直接帶入，模型只能照抄、不做加總與試算——算錯的報價，客人會當成承諾。" },
          { t: "擋得住話術", d: "客人訊息裡的「忽略前面的規則」「你現在是另一個角色」，一律當成一般問題處理，規則不會被改掉。" },
          { t: "真人接手，AI 自動讓開", d: "你在 LINE 上親自回覆後，AI 會先暫停回話，客人說的話照樣記錄並寄信通知你；暫停到期後自動恢復。" },
          { t: "對話紀錄與用量報表", d: "每段對話都留在後台可查，每月提供用量報表，知道客人最常問什麼。" },
          { t: "網站與 LINE 同一套", d: "官網即時聊天與 LINE 官方帳號共用同一份知識庫，更新一次，兩邊同步。" },
        ],
        timeline: "約 2–3 週，自知識庫資料（FAQ、價目、文件）齊備起算。",
        faq: [
          {
            q: "AI 會不會亂回答？",
            a: "回答範圍限定在你提供的資料；資料裡沒有的事，AI 會說不確定，並請客人留下聯絡方式，由真人回覆。價格這類數字由系統帶入，不讓模型自己算。",
          },
          {
            q: "上線後的 AI 用量怎麼計費？",
            a: "建置費含部署與知識庫首次建置；上線後建議搭配 AI 託管 {price:care-ai}／月，內含每月 AI API 用量額度、知識庫內容更新與流程監控。",
          },
          {
            q: "可以只做網站客服、不接 LINE 嗎？",
            a: "可以，兩個通道可以只開一個；之後要加開另一個，沿用同一份知識庫。",
          },
          {
            q: "可以先試用看看嗎？",
            a: "可以直接試我們自己的：本站的線上客服，以及 LINE 官方帳號 {line}，背後就是這套系統。",
          },
        ],
      },
      en: {
        name: "LINE AI Customer Service",
        title: "LINE AI Chatbot for Business | from {price:ai-chatbot} | Avalo",
        description:
          "AI customer service on your LINE Official Account and website, answering from a knowledge base built on your own FAQ and documents (RAG), with human handoff and conversation logs. From {price:ai-chatbot} excl. VAT, live in about 2–3 weeks.",
        label: "LINE AI customer service",
        h1: "LINE AI customer service\nthat answers from your own data",
        lede: "Opening hours, prices, plan differences, how to pay — most of what support answers every day is the same few dozen questions. Avalo's AI support runs on your LINE Official Account and your website, answering from a knowledge base built on your FAQ, price list and documents, and handing over to you when a human is needed. From {price:ai-chatbot} (excl. VAT), including deployment and the initial knowledge base.",
        fit: [
          "LINE Official Accounts with more messages than anyone can answer, or none answered after hours",
          "Support and sales teams answering the same questions dozens of times a day",
          "Service businesses with complex plans and pricing that customers often get wrong",
          "Companies curious about AI support but worried it will misquote or overpromise",
        ],
        points: [
          { t: "A knowledge base built on your data", d: "FAQ, price lists, service descriptions and documents organised so the AI can look them up (RAG) — answers are grounded, not imagined." },
          { t: "The AI never does the maths", d: "Prices and plans are inserted by the system and copied verbatim; the model never adds up or estimates. A wrong quote is a promise in the customer's eyes." },
          { t: "Resistant to manipulation", d: "Messages like \"ignore your previous rules\" or \"you are now someone else\" are treated as ordinary questions; the rules don't change." },
          { t: "Human takeover, AI steps aside", d: "When you reply yourself on LINE, the AI pauses, keeps logging what the customer says and emails you; it resumes automatically when the pause ends." },
          { t: "Logs and usage reports", d: "Every conversation is searchable in the dashboard, with a monthly usage report showing what customers ask most." },
          { t: "One system for web and LINE", d: "Website chat and your LINE Official Account share one knowledge base — update it once and both stay in sync." },
        ],
        timeline: "About 2–3 weeks, counted from when your FAQ, prices and documents are ready.",
        faq: [
          {
            q: "Will the AI make things up?",
            a: "Answers are limited to the material you provide. When something isn't covered, the AI says it isn't sure and asks for contact details so a person can follow up. Numbers such as prices are inserted by the system, never calculated by the model.",
          },
          {
            q: "How is AI usage billed after launch?",
            a: "The build fee covers deployment and the initial knowledge base. After launch we recommend AI Operations at {price:care-ai}/month, which includes a monthly AI API allowance, knowledge base updates and monitoring.",
          },
          {
            q: "Can I have website chat without LINE?",
            a: "Yes — either channel can run on its own, and adding the other later reuses the same knowledge base.",
          },
          {
            q: "Can I try it first?",
            a: "Try ours: the live chat on this site and our LINE Official Account {line} run on this same system.",
          },
        ],
      },
    },
  },
  {
    slug: "ai-automation",
    serviceType: "Business process automation",
    skus: ["automation", "automation-bundle", "dashboard"],
    addons: ["receipt-entry", "reports", "api", "rag"],
    cases: ["/cases/finance-automation", "/cases/agagent"],
    i18n: {
      "zh-TW": {
        name: "企業 AI 自動化",
        title: "企業 AI 自動化・流程自動化 {price:automation} 起｜自建自有、無月租｜Avalo 阿瓦羅",
        description:
          "對帳、報表、通知、資料搬運交給系統自動跑：每條工作流 {price:automation}（未稅）起，完全客製，串接 LINE／Email／Sheets／ERP／POS，自建自有、無第三方軟體月租；三條工作流＋數據儀表板的起步組合 {price:automation-bundle}。",
        label: "企業 AI 自動化・流程自動化",
        h1: "企業流程自動化：\n把重複的工作交給系統",
        lede: "每天把訂單抄進 Excel、每月花好幾天對帳做報表、LINE 上傳的收據要人一張張登記——這些重複的工作，可以讓系統自動跑。Avalo 的流程自動化完全客製、自建自有，每條工作流 {price:automation}（未稅）起；想一次把常見的流程與報表都做好，可以選 {price:automation-bundle} 的起步組合。",
        fit: [
          "每月花好幾天在 Excel 對帳、做報表的財務與行政",
          "訂單、表單、LINE 訊息要人工複製到其他系統的團隊",
          "老闆要看的數字散在 POS、電商與廣告後台，每次都要人整理",
          "已經在用自動化平台，但按用量計費的月費越來越高的公司",
        ],
        points: [
          { t: "完全客製、不綁平台", d: "依你的實際流程開發，不受現成平台的功能限制，也不會被單一廠商綁住。" },
          { t: "串接既有工具", d: "LINE、Email、Google Sheets、ERP、POS——沿用你現在的工具，把它們之間的人工搬運拿掉。" },
          { t: "自建自有、無月租", d: "系統屬於你，沒有按筆數或用量計費的第三方軟體月租。" },
          { t: "可以長成完整系統", d: "從一條通知串接開始，逐步長成財務記帳、報表、審批流程這類完整系統。" },
          { t: "AI 處理雜亂的資料", d: "收據照片、PDF、對話紀錄這類資料，由 AI 抽取欄位再寫進系統，例如 LINE 拍照上傳收據自動記帳（{addon:receipt-entry} 起）。" },
          { t: "出錯會通知、有調校期", d: "每條工作流都有錯誤監控與通知，並含上線後一個月的調校期。" },
        ],
        timeline: "依流程數量與複雜度而定，確認範圍時提供排程。",
        faq: [
          {
            q: "「一條工作流」是指什麼？",
            a: "一個從觸發到完成的自動流程，例如「LINE 收到收據照片 → AI 抽取日期與金額 → 寫進記帳表 → 每週彙整寄給會計」。範圍更大的系統（完整會計、進銷存、ERP 串接），諮詢後提供書面報價。",
          },
          {
            q: "數據儀表板可以單獨做嗎？",
            a: "可以。數據儀表板 {price:dashboard} 起，整合 POS、電商、廣告與表單數據，週報、月報自動寄送，手機也能看。",
          },
          {
            q: "上線之後誰維護？",
            a: "建議搭配 AI 託管 {price:care-ai}／月：流程監控、異常即時處理、知識庫更新與每月成效報告。",
          },
          {
            q: "會不會被你們綁住？",
            a: "不會。系統自建自有、沒有第三方軟體月租，資料屬於你。",
          },
        ],
      },
      en: {
        name: "AI Business Automation",
        title: "Business Process Automation with AI | from {price:automation} per workflow | Avalo",
        description:
          "Let systems handle reconciliation, reports, notifications and data entry: from {price:automation} per workflow excl. VAT, fully custom, integrating LINE / Email / Sheets / ERP / POS, self-owned with no SaaS fees. Starter bundle of three workflows plus a dashboard: {price:automation-bundle}.",
        label: "AI automation · Workflow automation",
        h1: "Business process automation:\nhand the repetitive work to a system",
        lede: "Copying orders into Excel every day, spending days each month reconciling accounts and building reports, logging receipts sent over LINE one by one — repetitive work like this can run on its own. Avalo's automation is fully custom and self-owned, from {price:automation} (excl. VAT) per workflow; to set up the common workflows and reports in one go, choose the {price:automation-bundle} starter bundle.",
        fit: [
          "Finance and admin staff who spend days each month reconciling and reporting in Excel",
          "Teams copying orders, forms or LINE messages into other systems by hand",
          "Managers whose numbers are scattered across POS, e-commerce and ad dashboards",
          "Companies whose usage-priced automation platform bill keeps growing",
        ],
        points: [
          { t: "Fully custom, no platform lock-in", d: "Built around your actual process, without the limits of an off-the-shelf platform or dependence on one vendor." },
          { t: "Works with your tools", d: "LINE, Email, Google Sheets, ERP, POS — keep the tools you use and remove the manual copying between them." },
          { t: "Self-owned, no subscriptions", d: "The system is yours, with no third-party software billed per task or per seat." },
          { t: "Grows into a full system", d: "Start with a single integration and grow into bookkeeping, reporting or approval systems." },
          { t: "AI for messy inputs", d: "Receipts, PDFs and chat logs are read by AI and turned into structured records — e.g. photograph a receipt on LINE and it is booked automatically (from {addon:receipt-entry})." },
          { t: "Alerts and a tuning period", d: "Every workflow comes with error monitoring and alerts, plus a month of tuning after launch." },
        ],
        timeline: "Depends on the number and complexity of workflows; we give a schedule when the scope is confirmed.",
        faq: [
          {
            q: "What counts as one workflow?",
            a: "One automated process from trigger to finish — for example: receipt photo arrives on LINE → AI extracts date and amount → written to the ledger → weekly summary emailed to the accountant. Larger systems (full accounting, inventory, ERP integration) are quoted in writing after a consultation.",
          },
          {
            q: "Can I get just the dashboard?",
            a: "Yes. The Data Dashboard starts at {price:dashboard}, bringing POS, e-commerce, ads and form data together, with weekly and monthly reports sent automatically and mobile access.",
          },
          {
            q: "Who maintains it after launch?",
            a: "We recommend AI Operations at {price:care-ai}/month: workflow monitoring, immediate incident response, knowledge base updates and a monthly performance report.",
          },
          {
            q: "Will we be locked in?",
            a: "No. The system is self-owned with no third-party subscriptions, and the data is yours.",
          },
        ],
      },
    },
  },
  {
    slug: "geo",
    serviceType: "Generative engine optimization",
    skus: ["site-rescue", "care-growth"],
    addons: ["seo-starter"],
    cases: ["/cases/jeantogo"],
    i18n: {
      "zh-TW": {
        name: "AI 搜尋優化（GEO）",
        title: "GEO AI 搜尋優化・SEO｜讓 ChatGPT 與 Google 讀得懂你的品牌｜Avalo 阿瓦羅",
        description:
          "GEO（生成式引擎優化）讓 ChatGPT、Gemini、Perplexity 與 Google 爬得到、讀得懂、引用得到你的網站：AI 爬蟲檢查、結構化資料、品牌資料一致與可引用的內容。網站健檢 {price:site-rescue} 起，或成長維護 {price:care-growth}／月持續調整。",
        label: "GEO・AI 搜尋優化・SEO",
        h1: "AI 搜尋優化（GEO）：\n讓 AI 讀得懂、引用得到你",
        lede: "越來越多人不再一頁頁翻搜尋結果，而是直接問 ChatGPT、Gemini 或 Perplexity「台北哪裡可以做…」。AI 回答時引用的，是它爬得到、讀得懂、信得過的網站。GEO（生成式引擎優化）做的就是這三件事。可以從 {price:site-rescue} 的網站健檢開始，或由成長維護方案每月持續調整。",
        fit: [
          "在 Google 有排名，但問 ChatGPT 時從來沒出現過的品牌",
          "品牌名稱跟其他公司撞名，AI 常把你講成別家",
          "內容很多、詢問很少，不知道問題出在哪的網站",
          "想知道 AI 爬蟲到底有沒有來過自己網站的人",
        ],
        points: [
          { t: "爬得到", d: "檢查 robots.txt、防火牆與 CDN 有沒有誤擋 Googlebot、Bingbot、GPTBot、PerplexityBot 這些爬蟲——擋錯一條規則，整個網站就從 AI 的視野裡消失。" },
          { t: "讀得懂", d: "語意化的標題結構，加上結構化資料（組織、服務、價格、常見問題），讓機器不必猜就知道你是誰、做什麼、多少錢。" },
          { t: "分得清", d: "公司名稱、地址、電話、統編在官網、Google 商家檔案與各平台寫成同一組，AI 才分得出你是哪一家。" },
          { t: "引用得到", d: "把客人常問的問題寫成可以直接引用的答案，放上第一手的案例與數字——具體的事實比形容詞更容易被引用。" },
          { t: "不只顧 Google", d: "ChatGPT 的搜尋功能會參考包括 Bing 在內的搜尋索引，所以 Bing Webmaster Tools 也要提交與監控。" },
          { t: "追得到成效", d: "從伺服器紀錄統計 AI 爬蟲的造訪，從 GA4 看來自 chatgpt.com、perplexity.ai 的流量，知道做了之後有沒有變化。" },
        ],
        faq: [
          {
            q: "GEO 跟 SEO 有什麼不同？",
            a: "SEO 讓你在搜尋結果排得更前面；GEO 讓 AI 在生成答案時引用你。兩者的地基相同——網站要爬得到、內容要讀得懂——GEO 更重視結構化資料、品牌資料的一致，以及可以被直接引用的答案。",
          },
          {
            q: "可以保證 ChatGPT 一定推薦我嗎？",
            a: "不能，任何人都無法保證。AI 的回答會隨模型、使用者與問法而變。我們能做的，是把會影響引用的因素做到位，並用數據追蹤變化。",
          },
          {
            q: "多久看得到效果？",
            a: "爬蟲重新造訪與索引通常需要數週；內容與外部提及的累積則以月計算。健檢報告會先列出最快見效的修正項目。",
          },
          {
            q: "要從哪裡開始？",
            a: "先做網站健檢（{price:site-rescue}）：一週內交付速度、SEO、資安與 AI 搜尋能見度的書面報告與改善路線圖，立即可修的項目直接修好，報告費可全額折抵後續服務。需要關鍵字規劃與頁面優化，可加購 SEO 起步包（{addon:seo-starter}）。",
          },
        ],
      },
      en: {
        name: "AI Search Optimization (GEO)",
        title: "Generative Engine Optimization (GEO) & SEO | Get cited by ChatGPT | Avalo",
        description:
          "GEO makes your site crawlable, understandable and citable for ChatGPT, Gemini, Perplexity and Google: AI crawler checks, structured data, consistent business details and quotable content. Audit from {price:site-rescue}, or ongoing tuning on Growth Care at {price:care-growth}/month.",
        label: "GEO · AI search · SEO",
        h1: "AI search optimization (GEO):\nbe understood — and cited — by AI",
        lede: "More and more people skip the results page and ask ChatGPT, Gemini or Perplexity directly: \"who builds websites in Taipei?\" The sites AI cites are the ones it can crawl, understand and trust. Generative engine optimization (GEO) works on exactly those three things. Start with a {price:site-rescue} audit, or keep improving month by month on a Growth Care plan.",
        fit: [
          "Brands that rank on Google but never come up when people ask ChatGPT",
          "Businesses whose name collides with another company's, so AI describes the wrong one",
          "Sites with plenty of content but few enquiries, and no idea why",
          "Anyone who wants to know whether AI crawlers ever visit their site",
        ],
        points: [
          { t: "Crawlable", d: "We check that robots.txt, firewalls and CDNs aren't blocking Googlebot, Bingbot, GPTBot or PerplexityBot — one wrong rule and the whole site disappears from AI's view." },
          { t: "Understandable", d: "Semantic headings plus structured data (organisation, services, prices, FAQ), so machines know who you are, what you do and what it costs without guessing." },
          { t: "Unambiguous", d: "Company name, address, phone and tax ID written the same way on your site, your Google Business Profile and every other platform, so AI can tell which business you are." },
          { t: "Quotable", d: "Common customer questions written as answers that can be cited directly, backed by first-hand cases and figures — concrete facts get quoted more than adjectives." },
          { t: "Beyond Google", d: "ChatGPT's search draws on search indexes including Bing, so Bing Webmaster Tools needs submitting and monitoring too." },
          { t: "Measurable", d: "AI crawler visits counted from server logs, and traffic from chatgpt.com or perplexity.ai tracked in GA4, so you can see whether things change." },
        ],
        faq: [
          {
            q: "How is GEO different from SEO?",
            a: "SEO moves you up the search results; GEO gets you cited when AI writes an answer. Both rest on the same foundation — a crawlable site with understandable content — while GEO puts more weight on structured data, consistent business details and answers that can be quoted directly.",
          },
          {
            q: "Can you guarantee ChatGPT will recommend me?",
            a: "No, and nobody can. AI answers vary with the model, the user and the question. What we can do is get the factors that influence citation right and track the results with data.",
          },
          {
            q: "How long until I see results?",
            a: "Re-crawling and indexing usually take a few weeks; content and external mentions build up over months. The audit report lists the quickest wins first.",
          },
          {
            q: "Where do I start?",
            a: "With a website audit ({price:site-rescue}): within a week you get a written report and roadmap covering speed, SEO, security and AI search visibility, quick fixes applied on the spot, and the fee credited in full toward later work. For keyword planning and on-page work, add the SEO starter ({addon:seo-starter}).",
          },
        ],
      },
    },
  },
  {
    slug: "maintenance",
    serviceType: "Website maintenance and hosting",
    skus: ["care-basic", "care-growth", "care-ai"],
    addons: ["domain"],
    cases: ["/cases/rekat", "/cases/monsieurlong"],
    i18n: {
      "zh-TW": {
        name: "網站維護代管",
        title: "網站維護・網站代管 {price:care-basic}／月起｜主機、備份、資安更新｜Avalo 阿瓦羅",
        description:
          "網站上線後的主機代管、SSL 憑證、每日自動備份、安全更新與監控告警，每月 {price:care-basic}（未稅）起；成長維護含每月 4 小時修改與 SEO＋GEO 調整，AI 託管含 AI 用量額度。信用卡每月自動扣款。",
        label: "網站維護・網站代管",
        h1: "網站維護與代管：\n上線之後，有人一直顧著",
        lede: "網站上線才是開始：主機要有人看、SSL 憑證要續、套件要更新、備份要真的還原得回來。這些事平常沒人注意，出事那天才發現沒人做。Avalo 的維護方案每月 {price:care-basic}（未稅）起，信用卡每月自動扣款；資料屬於你，隨時可以匯出。",
        fit: [
          "網站做好之後就沒人管，不知道備份、憑證還在不在",
          "原本的工程師或外包聯絡不上，網站出狀況沒人處理",
          "想每個月小改內容、加點功能，又不想每次重新報價",
          "AI 客服或自動化流程上線後，需要有人盯著用量與異常",
        ],
        points: [
          { t: "主機代管與 SSL", d: "主機、HTTPS 憑證與網域設定都有人管，不會因為憑證過期被瀏覽器標成「不安全」。" },
          { t: "每日自動備份", d: "每天自動備份，出事時還原得回來。" },
          { t: "安全更新與監控告警", d: "定期更新套件與系統、修補已知漏洞；網站出狀況時，監控會先通知我們。" },
          { t: "內容修改額度", d: "安心維護每月 2 次小幅修改；成長維護每月 4 小時，可以用在修改或新功能開發。" },
          { t: "SEO＋GEO 與數據報告", d: "成長維護每月做 SEO 與 AI 搜尋健檢調整，並提供數據報告與建議。" },
          { t: "資料主權", d: "資料屬於你，隨時可以匯出；網域登記在你名下，解約後提供 6 個月轉址，不綁架你的流量。" },
        ],
        faq: [
          {
            q: "最短要簽多久？",
            a: "搭配建置案時，維護方案最短承諾 12 個月，期滿後可隨時終止；單獨購買維護方案不綁約。",
          },
          {
            q: "不是 Avalo 做的網站也能維護嗎？",
            a: "先做一次網站健檢（{price:site-rescue}），確認現況與接手方式，再決定適合的維護方案；健檢費可全額折抵後續服務。",
          },
          {
            q: "解約之後網站與資料怎麼辦？",
            a: "資料屬於你：維護結束後有 30 天可以匯出資料；網域登記在你名下，並提供 6 個月轉址，客人不會找不到你。",
          },
          {
            q: "怎麼付款？",
            a: "信用卡每月自動扣款（綠界定期定額）。標價未稅，結帳加 5% 營業稅，可開立統編發票。",
          },
        ],
      },
      en: {
        name: "Website Maintenance & Hosting",
        title: "Website Maintenance & Hosting from {price:care-basic}/month | Avalo",
        description:
          "Hosting, SSL, daily backups, security updates and uptime alerts after launch, from {price:care-basic}/month excl. VAT. Growth Care adds four hours of changes a month plus SEO and GEO tuning; AI Operations includes an AI usage allowance. Billed monthly by card.",
        label: "Website maintenance · Hosting",
        h1: "Website maintenance and hosting:\nsomeone keeps watch after launch",
        lede: "Launch is the beginning: servers need watching, SSL certificates need renewing, software needs updating and backups need to actually restore. Nobody notices this work until the day it wasn't done. Avalo's care plans start at {price:care-basic}/month (excl. VAT), billed automatically by card — and your data is always yours to export.",
        fit: [
          "Sites nobody has looked after since launch — are the backups and certificates even there?",
          "Owners whose original developer can no longer be reached",
          "Businesses wanting small monthly changes without a new quote each time",
          "AI support or automations that need someone watching usage and errors",
        ],
        points: [
          { t: "Hosting and SSL", d: "Servers, HTTPS certificates and domain settings are managed, so no browser ever labels your site \"Not secure\" over an expired certificate." },
          { t: "Daily backups", d: "Automatic daily backups that can be restored when something goes wrong." },
          { t: "Security updates and alerts", d: "Regular software updates and patches for known vulnerabilities; monitoring alerts us when the site has a problem." },
          { t: "Edits included", d: "Two small edits a month on Essential Care; four hours a month on Growth Care, for changes or new features." },
          { t: "SEO, GEO and reporting", d: "Growth Care includes monthly SEO and AI search tuning, plus an analytics report with recommendations." },
          { t: "Your data, your domain", d: "Your data is yours to export at any time; your domain is registered in your name, with a 6-month redirect if you leave." },
        ],
        faq: [
          {
            q: "What is the minimum term?",
            a: "With a build, care plans have a 12-month minimum term and can be cancelled any time after; a care plan bought on its own has no minimum term.",
          },
          {
            q: "Can you maintain a site Avalo didn't build?",
            a: "Start with a website audit ({price:site-rescue}) to assess the site and how we would take it over, then choose a plan; the audit fee is credited in full toward later work.",
          },
          {
            q: "What happens to my site and data if I leave?",
            a: "Your data is yours: you have 30 days after care ends to export it, your domain is in your name, and we provide a 6-month redirect so customers can still find you.",
          },
          {
            q: "How do I pay?",
            a: "Automatic monthly card billing through ECPay. Prices exclude 5% VAT; tax invoices with your company number are available.",
          },
        ],
      },
    },
  },
  {
    slug: "website-audit",
    serviceType: "Website audit",
    skus: ["site-rescue"],
    addons: ["seo-starter"],
    cases: [],
    i18n: {
      "zh-TW": {
        name: "網站健檢",
        title: "網站健檢・速度與資安檢測 {price:site-rescue}｜一週內交付報告｜Avalo 阿瓦羅",
        description:
          "網站慢、排名掉、怕被駭？速度、SEO、資安與 AI 搜尋能見度四面向檢測，一週內交付書面報告與改善路線圖，立即可修的直接修復。{price:site-rescue}（未稅），報告費可全額折抵後續服務。",
        label: "網站健檢・急救",
        h1: "網站健檢：\n一週內告訴你，網站卡在哪裡",
        lede: "網站慢、排名掉、詢問變少，或只是不確定現在的網站還撐不撐得住——健檢從速度、SEO、資安與 AI 搜尋能見度四個面向檢查，一週內交付書面報告與改善路線圖，能立即修的直接修好。{price:site-rescue}（未稅），報告費可全額折抵後續服務。",
        fit: [
          "網站在手機上很慢，客人等不及就離開",
          "Google 排名或詢問量突然下滑，找不到原因",
          "擔心網站被駭、被植入惡意程式，或看到瀏覽器的安全警告",
          "準備重做網站，想先知道現在的網站問題在哪",
        ],
        points: [
          { t: "速度", d: "以 Core Web Vitals（LCP、INP、CLS）為準，檢查圖片、字型、腳本與伺服器回應。中文網路字型是常見的元兇，一個常見設定就能讓手機首頁多載 1MB 以上。" },
          { t: "SEO", d: "索引狀態、canonical 與 hreflang、sitemap、標題結構與結構化資料，找出搜尋引擎讀不懂或讀錯的地方。" },
          { t: "資安", d: "HTTPS 與憑證、安全標頭（CSP、HSTS）、對外暴露的管理介面，以及有已知漏洞的套件。" },
          { t: "AI 搜尋能見度（GEO）", d: "AI 爬蟲有沒有被誤擋、品牌資料是否一致、內容能不能被 AI 引用。" },
          { t: "立即修復", d: "報告裡能馬上修的項目直接修好，不必等下一個專案。" },
          { t: "書面報告＋路線圖", d: "依影響程度排序，列出每一項該怎麼改；報告費可全額折抵後續服務。" },
        ],
        timeline: "一週內交付報告。",
        faq: [
          {
            q: "需要提供什麼資料？",
            a: "網址就能開始檢測。如果要我們直接修復，需要主機或網站後台的存取權限，修改前會先跟你確認範圍。",
          },
          {
            q: "WordPress、Wix 這類平台做的網站也能檢查嗎？",
            a: "可以。速度、SEO、資安與 AI 搜尋能見度的檢測不限平台；能直接修復到什麼程度，取決於平台開放的權限。",
          },
          {
            q: "報告費真的可以折抵嗎？",
            a: "可以，健檢費 {price:site-rescue} 可全額折抵後續的建置或維護服務。",
          },
          {
            q: "健檢完一定要找你們做嗎？",
            a: "不用。報告與路線圖是你的，交給任何工程團隊都能照著改。",
          },
        ],
      },
      en: {
        name: "Website Audit",
        title: "Website Audit: Speed, SEO & Security for {price:site-rescue} | Avalo",
        description:
          "Slow site, falling rankings, security worries? An audit across speed, SEO, security and AI search visibility, with a written report and roadmap within a week and quick fixes applied. {price:site-rescue} excl. VAT, credited in full toward later work.",
        label: "Website audit",
        h1: "Website audit:\nwithin a week, find out what's holding your site back",
        lede: "Slow pages, slipping rankings, fewer enquiries — or just not knowing whether your current site is still up to the job. The audit covers speed, SEO, security and AI search visibility, delivers a written report and roadmap within a week, and fixes the quick wins on the spot. {price:site-rescue} (excl. VAT), credited in full toward later work.",
        fit: [
          "Sites so slow on mobile that customers give up waiting",
          "A sudden drop in rankings or enquiries with no obvious cause",
          "Worries about hacking, injected malware or browser security warnings",
          "Planning a rebuild and wanting to know what is wrong with the current site first",
        ],
        points: [
          { t: "Speed", d: "Measured against Core Web Vitals (LCP, INP, CLS): images, fonts, scripts and server response. Chinese web fonts are a common culprit — one common setup can add over 1MB to a mobile home page." },
          { t: "SEO", d: "Index coverage, canonical and hreflang, sitemap, heading structure and structured data — wherever search engines misread the site." },
          { t: "Security", d: "HTTPS and certificates, security headers (CSP, HSTS), exposed admin interfaces and packages with known vulnerabilities." },
          { t: "AI search visibility (GEO)", d: "Whether AI crawlers are blocked, whether your business details are consistent, and whether your content can be cited." },
          { t: "Fixed on the spot", d: "Anything in the report that can be fixed straight away is fixed, without waiting for a new project." },
          { t: "Written report and roadmap", d: "Ranked by impact, with what to change for each item; the fee is credited in full toward later work." },
        ],
        timeline: "Report delivered within a week.",
        faq: [
          {
            q: "What do you need from me?",
            a: "Just the URL to start. If you want us to fix things directly, we need access to the server or site admin, and we confirm the scope with you before changing anything.",
          },
          {
            q: "Can you audit WordPress or Wix sites?",
            a: "Yes. The speed, SEO, security and AI visibility checks work on any platform; how much we can fix directly depends on what the platform allows.",
          },
          {
            q: "Is the fee really credited?",
            a: "Yes — the {price:site-rescue} audit fee is credited in full toward a later build or care plan.",
          },
          {
            q: "Do I have to hire you afterwards?",
            a: "No. The report and roadmap are yours; any engineering team can work from them.",
          },
        ],
      },
    },
  },
  {
    slug: "payment",
    serviceType: "Payment gateway integration",
    skus: ["web-commerce"],
    addons: ["payment", "einvoice"],
    cases: [],
    i18n: {
      "zh-TW": {
        name: "金流串接",
        title: "綠界金流串接・信用卡定期定額 {addon:payment} 起｜Avalo 阿瓦羅",
        description:
          "綠界 ECPay、藍新 NewebPay 金流串接：信用卡一次付清與定期定額、付款結果驗章、扣款失敗通知、電子發票串接。單項串接 {addon:payment}（未稅）起，或選含金流的商務網站方案 {price:web-commerce}。",
        label: "金流串接・綠界・藍新",
        h1: "綠界、藍新金流串接：\n讓網站安全地收錢",
        lede: "網站要收錢，金流是最不能出錯的一段：付款結果要驗證、金額要對得上、扣款失敗要有人知道。Avalo 串接綠界 ECPay 與藍新 NewebPay，信用卡一次付清與定期定額都能做——你正在看的這個網站，就是用綠界信用卡與定期定額在收款。單項串接 {addon:payment}（未稅）起。",
        fit: [
          "已經有網站，想加上線上刷卡或訂閱扣款",
          "月費、課程、會員制的生意，需要信用卡定期定額",
          "用匯款收款，每天都要人工對帳的店家",
          "要通過金流商審核，不確定網站要揭露哪些資訊的商家",
        ],
        points: [
          { t: "一次付清與定期定額", d: "信用卡一次付清、每月自動扣款的定期定額都能串，月費類商品不必每月請客人重新刷卡。" },
          { t: "付款結果以驗章為準", d: "每筆金流通知都檢查 CheckMacValue，對不上就不入帳；不以瀏覽器回傳的結果判斷付款成功。" },
          { t: "金額由伺服器決定", d: "訂單金額在伺服器端依商品資料重新計算，前端送來的金額一律不採信。" },
          { t: "扣款失敗分階段通知", d: "定期定額扣款失敗時，依時程分階段寄出提醒，逾期才暫停服務，不會一失敗就斷。" },
          { t: "客人自助管理訂閱", d: "訂閱客戶有專屬頁面，可以查看扣款狀態與取消，不必寫信來問。" },
          { t: "審核要揭露的資訊", d: "金流商審核要求銷售頁揭露與商家資料一致的統編、地址、電話與退款政策，這些頁面我們會一起規劃到位。" },
        ],
        faq: [
          {
            q: "刷卡資料會經過我的網站嗎？",
            a: "不會。卡號在綠界的安全付款頁輸入，你的網站不經手、也不儲存任何卡號。",
          },
          {
            q: "定期定額的客人可以自己取消嗎？",
            a: "可以。我們的做法是給每位訂閱客戶一個自助管理頁，查看扣款狀態與取消都在那裡完成。",
          },
          {
            q: "需要電子發票嗎？",
            a: "依你的營業型態而定；需要的話可以加購電子發票串接（{addon:einvoice} 起），開立、作廢、寄送自動完成。",
          },
          {
            q: "交易手續費怎麼算？",
            a: "金流商的交易手續費依你與金流商簽訂的費率計算，由金流商向你收取。",
          },
        ],
      },
      en: {
        name: "Payment Integration",
        title: "ECPay Payment Integration & Recurring Billing from {addon:payment} | Avalo",
        description:
          "ECPay and NewebPay integration: one-off card payments and recurring billing, signature-verified payment results, failed-payment reminders and Taiwan e-invoices. Integration from {addon:payment} excl. VAT, or the Commerce Website plan with payments included at {price:web-commerce}.",
        label: "Payments · ECPay · NewebPay",
        h1: "ECPay and NewebPay integration:\nlet your site take payments safely",
        lede: "Payments are the part of a website that can't go wrong: results must be verified, amounts must match, and someone needs to know when a charge fails. Avalo integrates ECPay and NewebPay for one-off card payments and recurring billing — the site you are reading takes its own payments through ECPay cards and recurring billing. Integration from {addon:payment} (excl. VAT).",
        fit: [
          "Existing websites that need card payments or subscription billing",
          "Membership, course and monthly-fee businesses that need recurring card billing",
          "Shops reconciling bank transfers by hand every day",
          "Merchants preparing for gateway review and unsure what the site must disclose",
        ],
        points: [
          { t: "One-off and recurring", d: "One-off card payments and automatic monthly recurring billing, so subscribers never re-enter a card each month." },
          { t: "Signature-verified results", d: "Every gateway notification is checked against its CheckMacValue and rejected if it doesn't match; a payment never counts just because the browser said so." },
          { t: "The server sets the amount", d: "Order totals are recomputed on the server from product data; amounts sent by the browser are ignored." },
          { t: "Staged failed-payment reminders", d: "When a recurring charge fails, reminders go out in stages and service is paused only once overdue — not cut off at the first failure." },
          { t: "Self-service subscriptions", d: "Subscribers get their own page to check billing status and cancel, without emailing you." },
          { t: "What review requires", d: "Gateways require sales pages to disclose a tax ID, address, phone and refund policy matching your merchant record; we plan those pages with you." },
        ],
        faq: [
          {
            q: "Do card details pass through my website?",
            a: "No. Card numbers are entered on ECPay's secure payment page; your site never handles or stores them.",
          },
          {
            q: "Can subscribers cancel by themselves?",
            a: "Yes. Our approach gives every subscriber a self-service page for billing status and cancellation.",
          },
          {
            q: "Do I need e-invoices?",
            a: "It depends on your business. If you do, add e-invoice integration (from {addon:einvoice}) to issue, void and send invoices automatically.",
          },
          {
            q: "How are transaction fees charged?",
            a: "Gateway transaction fees follow the rate you agree with the payment provider and are charged to you by the provider.",
          },
        ],
      },
    },
  },
];

export const getService = (slug: string) => SERVICES.find((s) => s.slug === slug);
export const servicePath = (slug: string) => `/services/${slug}`;

/** 把價格記號展開成實際數字，給頁面與 metadata 用 */
export function filledCopy(s: Service, locale: string): ServiceCopy {
  const c = s.i18n[locale === "en" ? "en" : "zh-TW"];
  const f = (x: string) => fill(x);
  return {
    ...c,
    title: f(c.title),
    description: f(c.description),
    h1: f(c.h1),
    lede: f(c.lede),
    fit: c.fit.map(f),
    points: c.points.map((p) => ({ t: f(p.t), d: f(p.d) })),
    timeline: c.timeline ? f(c.timeline) : undefined,
    faq: c.faq.map((x) => ({ q: f(x.q), a: f(x.a) })),
  };
}
