export interface GuideSection {
  h: string;
  body: string[];
}

export interface Guide {
  slug: string;
  date: string;
  cluster: string;
  related: string[];
  i18n: Record<
    "zh-TW" | "en",
    { title: string; description: string; lede: string; sections: GuideSection[] }
  >;
}

export const GUIDES: Guide[] = [
  {
    slug: "website-cost-2026",
    date: "2026-11-02",
    cluster: "cost",
    related: ["/pricing", "/services/website"],
    i18n: {
      "zh-TW": {
        title: "2026 網站架設費用行情：形象官網、電商、客製系統各要多少",
        description: "用 Avalo 公開標價與市場區間對照：形象官網、商務網站、AI 客服與維護月費實際落在哪。不含保證排名。",
        lede: "「架一個網站多少錢」會得到 NT$3,000 到 NT$400,000 的答案，因為問的人把套版、形象官網、能收錢的電商和客製系統混在一起。下面用我們自己賣的方案拆開講。數字都是未稅。",
        sections: [
          {
            h: "先分你要哪一種網站",
            body: [
              "形象官網：讓人看懂你是誰、做什麼、怎麼聯絡。通常五頁以內，沒有購物車。我們的標價是 NT$39,000，市場區間大約 NT$30,000–100,000。",
              "商務網站：購物車、金流、預約或後台。我們的標價是 NT$89,000，市場區間大約 NT$75,000–400,000，差在金流種類、庫存和客製程度。",
              "客製系統：會計、ERP、報表自動化。沒有標準價，諮詢後書面報價。單條自動化工作流我們從 NT$29,000 起。",
            ],
          },
          {
            h: "建置費不是全部",
            body: [
              "網站上線後還有主機、SSL、備份、安全更新。我們的建置案必須搭配維護，形象官網對應安心維護 NT$2,990／月，自驗收通過才開始計。第一年大約是建置 39,000 加 12 個月維護 35,880，合計未稅 NT$74,880。",
              "有人把建置報得很低、維護藏在合約附件。把第一年總成本問清楚，比單看建置費有用。",
            ],
          },
          {
            h: "這個數字包什麼、不包什麼",
            body: [
              "我們的形象官網含全客製設計、RWD、SEO 基礎與 GA4、聯絡表單與 LINE 導流、部署上線。不含自有網域年費以外的特殊功能；多語系、線上預約是加購。",
              "文案與照片由你提供。交期自素材齊備起算。素材沒來，時程就不會開始——這點寫進交付說明，避免「付款兩週了怎麼還沒上線」。",
            ],
          },
        ],
      },
      en: {
        title: "What a website costs in Taiwan in 2026",
        description: "Brand sites, commerce sites, AI support and care plans, using Avalo's published prices against market ranges.",
        lede: "“How much is a website” ranges from a few thousand to several hundred thousand NT because people mix builders, brand sites, shops and custom systems. Here is how we split it. Prices exclude VAT.",
        sections: [
          {
            h: "Pick the kind of site",
            body: [
              "Brand site: who you are, what you do, how to reach you. Up to five pages, no cart. We charge NT$39,000; the market sits roughly NT$30,000–100,000.",
              "Commerce site: cart, payments, booking or admin. We charge NT$89,000; the market runs NT$75,000–400,000 depending on payments and inventory.",
              "Custom systems: accounting, ERP, automation. No list price — a written quote. A single automation workflow starts at NT$29,000.",
            ],
          },
          {
            h: "The build fee is not the whole bill",
            body: [
              "After launch someone still runs hosting, SSL, backups and updates. Our builds require a care plan; Essential Care is NT$2,990/month from acceptance. Year one for a brand site is about NT$74,880 excl. VAT.",
              "Ask for year-one total, not just the build line. Low build fees often hide care in an annex.",
            ],
          },
          {
            h: "What is in, what is not",
            body: [
              "Our brand site includes custom design, responsive layout, SEO foundation and GA4, a contact form and LINE, and deployment. Multilingual and booking are add-ons. Copy and photos come from you; the clock starts when they are ready.",
            ],
          },
        ],
      },
    },
  },
  {
    slug: "maintenance-fee",
    date: "2026-11-02",
    cluster: "cost",
    related: ["/services/maintenance", "/pricing"],
    i18n: {
      "zh-TW": {
        title: "網站維護費一個月多少才合理？逐項拆給你看",
        description: "主機、SSL、備份、安全更新、內容修改各佔什麼。Avalo 安心維護 NT$2,990／月的對照。",
        lede: "維護費被講得很玄，其實就是幾件具體的事：機器誰管、憑證誰換、備份有沒有、被掃的時候誰看、你改一句字誰來上。",
        sections: [
          {
            h: "月費通常含什麼",
            body: [
              "主機與 SSL：網站要 24 小時開著，憑證每年要換。這兩項掛掉，Google 會先告訴訪客「不安全」。",
              "每日備份：資料庫與上傳檔。沒有離線備份時，硬碟一壞就是全部重做。",
              "安全更新與監控：套件漏洞、憑證到期、服務是否還在跑。我們自己的站用 cron 每 5 分鐘探一次活。",
              "內容修改額度：安心維護每月 2 次小幅修改，成長維護每月 4 小時。額度不累積、不折現。",
            ],
          },
          {
            h: "我們怎麼標價",
            body: [
              "安心維護 NT$2,990／月，市場約 NT$1,500–5,000。成長維護 NT$5,990／月，含 SEO／GEO 微調與每月分析建議。AI 維運 NT$8,990／月，給客服與自動化流程。",
              "建置案有 12 個月最短承諾，因為建置費低於行情，維護是對價的一部分。單獨買維護沒有承諾期，可隨時停。",
            ],
          },
        ],
      },
      en: {
        title: "What fair website care costs per month",
        description: "Hosting, SSL, backups, updates and edit hours — mapped to Avalo's Essential Care at NT$2,990/month.",
        lede: "Care fees sound vague. They are specific jobs: who runs the box, who renews the certificate, whether backups exist, who watches scans, who ships a copy change.",
        sections: [
          {
            h: "What a monthly fee usually covers",
            body: [
              "Hosting and SSL, daily backups, security updates and monitoring, and a small edit allowance. Essential Care is two small edits a month; Growth Care is four hours. Hours do not roll over.",
            ],
          },
          {
            h: "How we price it",
            body: [
              "Essential Care NT$2,990/month (market about NT$1,500–5,000). Growth Care NT$5,990, including SEO/GEO tuning. AI Ops NT$8,990 for agents and automations. Builds have a 12-month minimum because the build fee is below market; care-only plans can be cancelled any time.",
            ],
          },
        ],
      },
    },
  },
  {
    slug: "wix-vs-custom",
    date: "2026-11-02",
    cluster: "cost",
    related: ["/services/website", "/pricing"],
    i18n: {
      "zh-TW": {
        title: "Wix、Shopline、WordPress 與客製網站的五年總成本",
        description: "套版平台年費加上你的時間，對上客製建置加維護。沒有唯一答案，有適用條件。",
        lede: "套版不是騙人，客製也不是貴族。差在五年裡你付的是平台年費與自己的工時，還是一次建置加有人顧的月費。",
        sections: [
          {
            h: "套版適合誰",
            body: [
              "預算緊、願意自己排版、功能落在平台既有模組裡。Wix／Shopline 的年費看起來低，但主題、交易手續費、應用外掛會往上加。你自己改版面的時間也是成本。",
            ],
          },
          {
            h: "客製適合誰",
            body: [
              "品牌有自己的視覺、速度與 SEO 要有人負責、上線後要有人維護、或平台做不到（例如每日口味後台、才數計算機、LINE AI 客服）。五年粗算：形象官網建置 39,000 加 60 個月 × 2,990 ≈ 218,400，未稅。這段期間對方不能把你鎖在他們的主題裡。",
            ],
          },
          {
            h: "不要混著比",
            body: [
              "用套版的月費去比客製的建置費，或用客製的第一年去比套版的第一個月，都會得到自己想要的結論。把「五年總支出」和「誰在半夜修網站」放在同一張紙上。",
            ],
          },
        ],
      },
      en: {
        title: "Wix, Shopline, WordPress vs custom — five-year cost",
        description: "Platform fees plus your time, versus a custom build plus care. Conditions, not a winner.",
        lede: "Builders are not a scam and custom is not luxury. The difference is whether five years of spend is platform fees and your hours, or a build plus someone on call.",
        sections: [
          {
            h: "When a builder wins",
            body: ["Tight budget, you will edit the theme yourself, and the features exist as modules. Theme, transaction fees and apps add up; so does your time."],
          },
          {
            h: "When custom wins",
            body: ["A visual identity of your own, someone accountable for speed and SEO, care after launch, or features a builder cannot do. A brand site plus 60 months of Essential Care is about NT$218,400 excl. VAT, and you are not stuck in their theme."],
          },
          {
            h: "Compare like with like",
            body: ["Do not stack a builder's monthly fee against a custom build, or a custom year-one against a builder's first month. Put five-year spend and who fixes the site at 1 a.m. on the same page."],
          },
        ],
      },
    },
  },
  {
    slug: "geo-vs-seo",
    date: "2026-11-02",
    cluster: "geo",
    related: ["/services/geo", "/tools/geo"],
    i18n: {
      "zh-TW": {
        title: "GEO 是什麼？跟 SEO 差在哪",
        description: "SEO 讓你排在搜尋結果前面；GEO 讓 ChatGPT、Gemini、Perplexity 回答時引用你。地基相同，做法不同。",
        lede: "越來越多人直接問 AI「台北哪裡可以做形象官網」。AI 引用的是它爬得到、讀得懂、信得過的網站。GEO（生成式引擎優化）做的就是這三件事。",
        sections: [
          {
            h: "相同的地基",
            body: [
              "網站要能被爬：robots.txt 不要誤擋 Googlebot、Bingbot、GPTBot、PerplexityBot。",
              "內容要讀得懂：標題層級、canonical、結構化資料（組織、服務、價格、FAQ）。",
              "品牌要分得清：名稱、地址、電話、統編在官網與 Google 商家檔案寫成同一組。我們叫 Avalo，網路上還有美國的 avalo.ai 與越南的 Avalo Design，沒有統編與地址，AI 會認錯人。",
            ],
          },
          {
            h: "GEO 多做的",
            body: [
              "把客人常問的問題寫成可直接引用的答案，放第一手案例與數字，少放形容詞。",
              "提交 Bing Webmaster Tools：ChatGPT 搜尋會參考包括 Bing 在內的索引。",
              "追蹤 chatgpt.com、perplexity.ai 的來源，以及 GPTBot 有沒有來過。沒人能量到的優化，做了也不知道。",
            ],
          },
          {
            h: "不能保證的事",
            body: [
              "沒有人能保證 ChatGPT 一定推薦你。模型、問法、使用者都會變。能做的是把會影響引用的因素做到位，並用同一組問題每月問一次看有沒有被提到。",
            ],
          },
        ],
      },
      en: {
        title: "What GEO is, and how it differs from SEO",
        description: "SEO ranks you in results; GEO gets you cited by ChatGPT, Gemini and Perplexity. Same foundation, different emphasis.",
        lede: "More people skip the results page and ask AI who builds brand sites in Taipei. The sites that get cited are crawlable, understandable and trusted. That is generative engine optimization.",
        sections: [
          {
            h: "The shared foundation",
            body: [
              "Crawlable robots.txt, readable structure and schema, and one consistent NAP so AI can tell which Avalo you are — not avalo.ai or Avalo Design in Vietnam.",
            ],
          },
          {
            h: "What GEO adds",
            body: [
              "Quotable answers, first-hand cases, Bing submission, and logs of GPTBot plus traffic from chatgpt.com and perplexity.ai.",
            ],
          },
          {
            h: "What nobody can promise",
            body: ["No one can guarantee ChatGPT will recommend you. Track a fixed set of questions every month instead."],
          },
        ],
      },
    },
  },
  {
    slug: "line-ai-chatbot",
    date: "2026-11-02",
    cluster: "line",
    related: ["/services/line-ai-chatbot", "/tools/savings"],
    i18n: {
      "zh-TW": {
        title: "LINE 官方帳號 AI 客服怎麼做：費用、流程、限制",
        description: "LINE OA 加網站雙通道、用你的資料當知識庫、轉真人。Avalo 標價 NT$69,000，含部署與初始知識庫。",
        lede: "台灣中小企業的客人先加 LINE，不先填表單。AI 客服要接在官方帳號上，而且網站那顆聊天鈕要講同一套話，不然客人會覺得你們有兩個窗口在互踢。",
        sections: [
          {
            h: "我們怎麼接",
            body: [
              "LINE Webhook 與官網聊天共用同一套知識庫與同一套轉人規則。價格、交期、方案從商品目錄當場算出來，不另抄一份——抄了就會在調價後繼續報舊價。",
              "標價 NT$69,000（未稅），市場常見 NT$100,000–500,000。必須搭配 AI 維運月費。知識庫來自你的 FAQ、方案與條款。",
            ],
          },
          {
            h: "限制要先講",
            body: [
              "AI 會講錯。我們用規則擋住「自己算總價、自己答應折扣、自己改身分」。超出標準方案、議價、客訴，轉給專人。",
              "模型按使用量計費。維運方案含每月額度與上限，避免一則惡意對話把帳單打穿。上限到了就改請專人接手。",
            ],
          },
        ],
      },
      en: {
        title: "How we build LINE OA AI support: cost, flow, limits",
        description: "LINE plus on-site chat, trained on your material, with human handoff. Avalo lists it at NT$69,000.",
        lede: "In Taiwan, customers add LINE before they fill a form. The agent has to live on the official account, and the site widget has to tell the same story.",
        sections: [
          {
            h: "How we wire it",
            body: [
              "The LINE webhook and the site chat share one knowledge base and one handoff policy. Prices are computed from the catalogue, never copied. The plan is NT$69,000 excl. VAT plus AI Ops.",
            ],
          },
          {
            h: "Limits we state up front",
            body: [
              "The model will be wrong sometimes. Rules block it from totalling quotes, granting discounts or changing identity. Custom scope, haggling and complaints go to a human. Monthly usage is capped so one abusive thread cannot blow the bill.",
            ],
          },
        ],
      },
    },
  },
  {
    slug: "ai-quote-guardrails",
    date: "2026-11-02",
    cluster: "line",
    related: ["/services/line-ai-chatbot", "/pricing"],
    i18n: {
      "zh-TW": {
        title: "AI 客服會不會亂報價？我們怎麼設計防線",
        description: "客服禁止自己加總與年度試算；總額導向購物車。這條規則有自動測試。來源是 Avalo 自己的客服實作。",
        lede: "客人問「形象官網加 AI 客服一年多少」時，模型很愛自己乘 12。乘錯一次，那筆數字就會被當成承諾。所以我們不讓它乘。",
        sections: [
          {
            h: "只能照抄，不能自己算",
            body: [
              "知識庫裡每個方案同時寫未稅價與含稅價，客服照念即可。跨項目相加、乘月數、估第一年總額，一律禁止。客人要總額時，請他用購物車；結帳頁用同一套函式算含稅，後端不接受瀏覽器送來的金額。",
            ],
          },
          {
            h: "測試會擋回歸",
            body: [
              "有測試專門確認客服回覆裡不會出現自己編的總價。調價時如果有人又手抄一份到 prompt，測試會先失敗。這比「請 AI 小心一點」可靠。",
            ],
          },
        ],
      },
      en: {
        title: "Will the AI invent a quote? The guardrails we actually ship",
        description: "No mental arithmetic, totals go through the cart, pinned by tests. From Avalo's own agent.",
        lede: "Asked for a year-one total, models love to multiply by twelve. One wrong product becomes a promise. So we do not let it multiply.",
        sections: [
          {
            h: "Copy, do not calculate",
            body: [
              "Each plan lists prices excl. and incl. VAT. Adding lines or annualising is forbidden. Combined totals go through the cart; checkout recomputes tax with the same function and ignores amounts sent from the browser.",
            ],
          },
          {
            h: "Tests catch regressions",
            body: ["A test fails the build if the agent starts inventing totals. That is more reliable than asking the model to be careful."],
          },
        ],
      },
    },
  },
  {
    slug: "ecpay-review-rejection",
    date: "2026-11-02",
    cluster: "pay",
    related: ["/services/payment", "/legal/terms"],
    i18n: {
      "zh-TW": {
        title: "綠界信用卡收款審核被退件：我們踩過的真實原因",
        description: "2026-08-13 Avalo 第一次送審被退，是銷售頁的統編、地址、電話、Email 與綠界廠商資料不一致。",
        lede: "綠界要你在銷售網頁上揭露與「賣家資料」完全相同的統編、地址、電話與 Email。我們第一次送審在 2026-08-13 被退，原因就是這一項，不是金流程式寫錯。",
        sections: [
          {
            h: "他們在對的是字串，不是意思",
            body: [
              "「臺北市」與「台北市」、「6樓之1」與「6F-1」在人看來是同一件事，在審核看來是兩家。頁尾的商家資訊必須和綠界廠商專區填的字元一模一樣。",
              "我們把統編、地址、電話、登記信箱收成程式裡的一組常數，條款、頁尾、結構化資料都從那裡讀。改一處，全站一起改，避免下次再被退。",
            ],
          },
          {
            h: "還要公開的東西",
            body: [
              "服務價格、聯絡方式、退款政策必須公開可讀。這也是為什麼定價頁與法律文件在上線第一天就要在，而不是「之後再補」。",
            ],
          },
        ],
      },
      en: {
        title: "ECPay review bounced: the reason we actually hit",
        description: "On 2026-08-13 Avalo's first card-collection review failed because NAP and email on the sales page did not match the merchant file — exactly.",
        lede: "ECPay requires the tax ID, address, phone and email on the sales page to match the merchant file character for character. Our first submission failed on 2026-08-13 for that, not for a broken payment integration.",
        sections: [
          {
            h: "They compare strings, not meaning",
            body: [
              "Taipei vs 臺北, 6F-1 vs 6樓之1, look the same to a person and like two firms to a reviewer. We keep legal details in one constant and feed the footer, terms and schema from it.",
            ],
          },
          {
            h: "What else must be public",
            body: ["Prices, contact details and the refund policy have to be readable on day one. That is why the pricing page and legal docs ship with the site."],
          },
        ],
      },
    },
  },
  {
    slug: "ecpay-recurring-first-charge",
    date: "2026-11-02",
    cluster: "pay",
    related: ["/services/payment", "/pricing"],
    i18n: {
      "zh-TW": {
        title: "定期定額第一期什麼時候扣？一個會讓客人多付一期的坑",
        description: "綠界定期定額在授權當下就扣第一期。零元啟動的席次保留金若不當成已付的一期，客人會被多扣一個月。",
        lede: "促銷「零元啟動」下單時收 NT$2,000 席次保留金，說好折抵第一期月費。綠界的定期定額卻是授權當下就扣第一期。若照 24 個月去授權，加上保留金就變成 25 期。",
        sections: [
          {
            h: "正確的算法",
            body: [
              "保留金相當於幾期月費，授權期數就要扣掉那幾期。NT$2,000 月費、NT$2,000 保留金，授權 23 期而不是 24 期。上線驗收後才建立定期定額，製作期間不扣月費。",
              "這段邏輯寫在程式裡，用整除而不是寫死「1」，以免日後保留金改成兩期時再踩一次。",
            ],
          },
          {
            h: "為什麼要公開講",
            body: [
              "金流的時點是契約的一部分。客人多付一期不會自己來問「是不是定期定額的特性」，他會覺得被多收。把時點寫在條款與結帳頁，比事後解釋便宜。",
            ],
          },
        ],
      },
      en: {
        title: "When ECPay recurring billing takes the first period",
        description: "Authorisation charges period one immediately. If a promo deposit is not counted as prepaid, the customer pays an extra month.",
        lede: "Zero Setup takes a NT$2,000 seat deposit, credited to month one. ECPay recurring billing charges period one at authorisation. Authorise 24 months and the deposit becomes a 25th charge.",
        sections: [
          {
            h: "The arithmetic that is actually correct",
            body: [
              "Subtract prepaid periods from the term. NT$2,000/month with a NT$2,000 deposit means 23 authorised periods, not 24. Recurring billing starts after launch and acceptance.",
            ],
          },
          {
            h: "Why we publish it",
            body: ["Customers will not ask whether that extra charge is 'how recurring billing works'. They will think they were overcharged. Put the timing in the terms and on checkout."],
          },
        ],
      },
    },
  },
  {
    slug: "domain-ownership",
    date: "2026-11-02",
    cluster: "ops",
    related: ["/services/maintenance", "/legal/terms"],
    i18n: {
      "zh-TW": {
        title: "網域與原始碼在誰名下？別被外包商綁架",
        description: "網域登記人必須是你。Avalo 代為申請時登記人填客戶本人；解約提供 6 個月轉址。",
        lede: "外包結束後最常見的綁架不是「程式碼不給」，而是網域還在對方帳號裡。客人搜你的店名，進的是一個已經停權的畫面。",
        sections: [
          {
            h: "我們怎麼做",
            body: [
              "代為申請網域時，登記人一律是你。客戶站即使暫時掛在我們的子網域，這條規則也不變。解約後提供 6 個月轉址。",
              "原始碼：標準建置於維護承諾期滿後免費移交；零元啟動於 24 個月期滿後移交。移交前你仍然擁有內容與資料，隨時可匯出。",
            ],
          },
          {
            h: "簽約前可以問的",
            body: [
              "網域登記人是誰、DNS 在哪個帳號、原始碼什麼時候交、備份怎麼拿、解約後舊網址還能指多久。答不出來的人，不要把你的門面放在他那裡。",
            ],
          },
        ],
      },
      en: {
        title: "Whose name is the domain in?",
        description: "You must be the registrant. When Avalo registers a domain, it is in your name. We redirect for six months after you leave.",
        lede: "The usual lock-in after a freelancer leaves is not withheld source — it is a domain still sitting in their registrar account.",
        sections: [
          {
            h: "What we do",
            body: [
              "You are the registrant. After you leave we redirect for six months. Source is handed over at the end of the care term (24 months on Zero Setup). Content and data are yours throughout and can be exported any time.",
            ],
          },
          {
            h: "Ask before you sign",
            body: ["Who is the registrant, which account holds DNS, when source is delivered, how backups are fetched, how long the old URL still works. If they cannot answer, do not put your front door there."],
          },
        ],
      },
    },
  },
];

export const getGuide = (slug: string) => GUIDES.find((g) => g.slug === slug);
