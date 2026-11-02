export interface Industry {
  slug: string;
  cases: string[];
  service: string;
  i18n: Record<
    "zh-TW" | "en",
    {
      name: string;
      title: string;
      description: string;
      h1: string;
      lede: string;
      points: { t: string; d: string }[];
    }
  >;
}

export const INDUSTRIES: Industry[] = [
  {
    slug: "food",
    cases: ["/cases/monsieurlong", "/cases/rekat"],
    service: "website",
    i18n: {
      "zh-TW": {
        name: "餐飲・甜點・咖啡",
        title: "餐飲品牌官網設計｜菜單會變、網站不能過期｜Avalo 阿瓦羅",
        description:
          "給手工甜點、烘豆坊、餐廳的形象官網與線上商店。今日口味、豆子售完，店家用手機自己改。隆先生與 REKAT 都在線上。",
        h1: "菜單天天在變的店，\n網站不該三個月就過期",
        lede: "餐飲品牌真正難的不是把照片排好看，是櫃上換了什麼、哪包豆子賣完，官網要跟得上。我們把「會變的」交給店家的手機，「不會變的」留在設計裡。",
        points: [
          { t: "店家自己更新", d: "今日口味、售完標示、一句公告，用手機勾選就好，不必找工程師。" },
          { t: "先講清楚再下單", d: "風味、處理法、過敏原這類專業，做成客人看得懂的圖解，再把購買接在後面。" },
          { t: "問得到人", d: "合作、伴手禮、企業送禮走表單或 LINE，進同一個收件匣。" },
        ],
      },
      en: {
        name: "Food, dessert & coffee",
        title: "Restaurant & café websites | Menus that change daily | Avalo",
        description:
          "Brand sites and shops for gelato, roasteries and restaurants. Today's flavours and sold-out beans are updated by the shop from a phone. Monsieur Long and REKAT are live.",
        h1: "If the menu changes every day,\nthe site cannot freeze",
        lede: "The hard part for a food brand is not pretty photos — it is keeping the site in step with the case and the roast. We give the shop a phone-sized control for what changes, and keep the design in version control.",
        points: [
          { t: "The shop updates it", d: "Today's flavours, sold-out marks, a one-line notice — ticked on a phone." },
          { t: "Explain, then sell", d: "Flavour, process, allergens as pictures a customer can read, with checkout behind them." },
          { t: "Enquiries land in one place", d: "Collabs, gifts and catering go through a form or LINE into one inbox." },
        ],
      },
    },
  },
  {
    slug: "trade",
    cases: ["/cases/wenshan"],
    service: "website",
    i18n: {
      "zh-TW": {
        name: "傳統產業・材料行",
        title: "傳統產業官網設計｜型錄、估價、詢價清單｜Avalo 阿瓦羅",
        description:
          "把木料、五金、材料行的專業做成線上就能開始的生意：分類型錄、估價計算機、詢價清單。文山木材行是線上可驗證的例子。",
        h1: "傳了三代的專業，\n要讓客人在線上就問得出口",
        lede: "傳統產業的客人不是來讀公司沿革的。他要先判斷你有沒有他要的料、大概多少錢、怎麼問。官網把這三件事做完，電話才會響。",
        points: [
          { t: "用行業單位說話", d: "才數、規格、產地，不要硬翻成電商的「件」。計算機跟型錄用同一套單位。" },
          { t: "詢價清單", d: "客人把品項加進清單再送出，你收到的是一筆生意，不是一封「請問有木材嗎」。" },
          { t: "現場感不必靠套版", d: "3D 原木、手繪地圖這類東西，是為了讓人覺得這家店是真的，不是模板換 logo。" },
        ],
      },
      en: {
        name: "Trade & materials",
        title: "Trade-yard websites | Catalogues, estimates, quote lists | Avalo",
        description:
          "Turn lumber, hardware and materials expertise into business that starts online: catalogues in trade units, estimators, quote lists. Wenshan Lumber is live.",
        h1: "Expertise three generations deep\nshould be askable online",
        lede: "Trade customers are not here for a company history. They need to see whether you stock what they need, roughly what it costs, and how to ask. Do those three things and the phone rings.",
        points: [
          { t: "Speak in trade units", d: "Board feet, grades, origin — not generic 'items'. Calculators share the same units as the catalogue." },
          { t: "A quote list, not a blank email", d: "Customers add lines and send; you receive a job, not 'do you have wood?'." },
          { t: "Presence without a template", d: "A 3D log, a drawn map — so the yard feels real, not a theme with a new logo." },
        ],
      },
    },
  },
  {
    slug: "association",
    cases: ["/cases/gtclub"],
    service: "website",
    i18n: {
      "zh-TW": {
        name: "協會・社群",
        title: "協會與社群官網｜招募、電子報、主題專區｜Avalo 阿瓦羅",
        description:
          "給協會與社群的品牌官網：主題專區、成果展示、加入表單與電子報。台灣共好交流協會的網站正在招募。",
        h1: "協會要被找到、被加入，\n不是只被看見一張海報",
        lede: "社群的網站要做三件事：講清楚你們在做什麼、讓人一鍵加入、讓發起人看得到進度。表單送出要立刻通知，不能進垃圾匣。",
        points: [
          { t: "主題專區", d: "AI、永續、活動這類軸線各自成頁，搜尋引擎與 AI 才知道你到底是誰。" },
          { t: "加入與電子報", d: "驗證、防垃圾、落地頁、即時 Email，送出當下就算完成，不是「我們再聯絡」。" },
          { t: "給發起人看的數字", d: "加入人數、造訪，不要讓營運者憑感覺猜有沒有人來。" },
        ],
      },
      en: {
        name: "Associations & communities",
        title: "Association websites | Join forms, newsletters, topic hubs | Avalo",
        description:
          "Brand sites for associations and communities: topic hubs, a works showcase, join forms and newsletters. GT Club Taiwan is live and recruiting.",
        h1: "An association needs to be found and joined,\nnot just posted as a flyer",
        lede: "A community site has three jobs: say what you do, let someone join in one tap, and show organisers that it is working. A submitted form has to notify someone immediately.",
        points: [
          { t: "Topic hubs", d: "AI, sustainability, events as their own pages, so search and AI know who you are." },
          { t: "Join + newsletter", d: "Validation, anti-spam, a landing page, instant email — submitted means done." },
          { t: "Numbers for organisers", d: "Join counts and visits, so nobody is guessing whether people came." },
        ],
      },
    },
  },
];

export const getIndustry = (slug: string) => INDUSTRIES.find((i) => i.slug === slug);
