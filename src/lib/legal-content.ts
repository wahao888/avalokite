// 法務頁內容（綠界特約商店審核必備：服務價格、聯絡方式、退款政策需公開）
//
// ⚠️ 這份文件是客戶結帳時打勾同意的契約本文，訂單會存下當下的版本與內容雜湊。
//    **修改內容時必須同時做兩件事**，否則既有訂單的同意紀錄會對不回原文：
//      1. 把「現行」的整份內容複製進 legal-archive.ts，標上舊的 LEGAL_VERSION
//      2. 改完內容後更新下方的 LEGAL_VERSION（用改動日期）
//    詳見 legal-archive.ts 的說明與 deploy/DEPLOY.md。
import { COMPANY, SITE } from "./site";

/**
 * 條款版本。客戶同意的版本會寫進訂單，日後爭議時據此還原當時的條款全文。
 * 格式為改動日期；同一天改多次就加序號（2026-08-07b）。
 */
export const LEGAL_VERSION = "2026-09-03";

/** 結帳時要求同意的文件（其他文件如隱私權為告知性質，不在同意範圍） */
export const AGREED_DOCS = ["terms", "refund"] as const;

export interface LegalSection {
  h: string;
  body: string[];
}
export interface LegalDoc {
  updated: string;
  sections: LegalSection[];
}

type DocKey = "terms" | "privacy" | "refund";

export const LEGAL: Record<DocKey, Record<"zh-TW" | "en", LegalDoc>> = {
  terms: {
    "zh-TW": {
      updated: LEGAL_VERSION,
      sections: [
        {
          h: "一、服務提供者與適用範圍",
          body: [
            `本網站由${COMPANY.legalName}（統一編號 ${COMPANY.taxId}，以品牌「${SITE.name}」對外營業，下稱「本公司」）經營，提供網站設計開發、企業 AI 自動化、系統整合等數位服務。`,
            `營業地址：${COMPANY.address}。聯絡電話：${COMPANY.phoneDisplay}。客服信箱：${SITE.email}（與登記信箱 ${COMPANY.registeredEmail} 為同一收件匣）。LINE：${SITE.lineId}。`,
            "本條款適用於您透過本網站訂購之所有服務。您於結帳時勾選同意，即與本公司成立契約；本公司會記錄您同意的條款版本與時間，作為雙方權利義務之依據。",
            "本條款中，「建置服務」指網站、AI 應用、自動化流程等一次性交付之專案；「維護方案」指按月計費之託管、備份、監控與內容修改服務。",
          ],
        },
        {
          h: "二、訂購與付款",
          body: [
            "網站上標示之價格均為新台幣未稅價，結帳時加計 5% 營業稅。付款透過綠界科技 ECPay 處理，一次性款項與維護月費均以信用卡支付。",
            "建置服務須搭配一份維護方案。建置款與維護月費為兩筆分開的授權：建置款（或促銷方案之席次保留金）於結帳時一次收取；維護月費自網站上線並經您驗收之日起計收，於該日後另行以信用卡定期定額授權，首期於授權當下扣款，其後每月自動扣款。網站製作期間不計收月費。",
            "促銷方案之席次保留金於結帳時收取，用以保留名額並排入製作排程；網站上線驗收後全額折抵首期月費，不另計費。因可歸責於本公司之事由致未能交付者，全額退還。",
            "本公司採公開定價、不二價原則。客製專案於免費諮詢後提供書面固定報價，經雙方確認後始行開工。",
            "維護月費之價格於您的訂閱存續期間維持不變；如日後調整定價，僅適用於新訂單。",
          ],
        },
        {
          h: "三、最短承諾期與續約",
          body: [
            "含建置服務之訂單，其維護方案自網站上線驗收日起算，有 12 個月之最短承諾期。這是因為建置服務以遠低於市場行情之價格交付，並以後續維護作為對價之一部分。",
            "單獨訂購維護方案（未含建置服務）無最短承諾期，得隨時終止。",
            "促銷方案另訂有承諾期與專屬條件，以該方案於定價頁公告之條款為準，其效力優先於本條。",
            "承諾期屆滿後自動轉為按月計費，您得隨時終止，停扣自次一期生效。",
            "承諾期內提前終止者，本公司得請求補付「尚未攤提完畢之建置費」。促銷方案係將標準建置費 NT$39,000 分攤於承諾期內收取，提前終止即就未攤提部分補付，金額依已完成扣款期數採下列級距：已完成 0–5 期補付 NT$30,000；6–11 期 NT$20,000；12–17 期 NT$10,000；18–23 期 NT$5,000；滿 24 期起為 0 元。",
            "前項為補付未攤提之建置費，非違約罰金，亦不包含尚未提供之月份月費——本公司不就未提供之服務收費。因可歸責於本公司之事由致終止者，不適用前項。",
          ],
        },
        {
          h: "四、服務流程與交付",
          body: [
            "建置服務流程：需求訪談 → 設計確認 → 開發 → 測試驗收 → 部署上線。一般於款項付清且素材齊備後 1–2 個月內完成，實際時程依專案複雜度於訪談後確認並以書面為準。",
            "驗收以雙方確認之需求清單為準。交付後 7 日內未提出書面異議者，視為驗收通過。",
            "上線後 14 日內之錯誤修正免費。逾期或屬需求變更者，依維護方案之時數計算或另行報價。",
            "設計階段包含兩次修改；超出部分依維護方案時數或另行報價。",
          ],
        },
        {
          h: "五、維護方案內容與服務水準",
          body: [
            "維護方案之服務內容以您訂購之方案於定價頁所列項目為準，一般包含主機代管、SSL 憑證、每日自動備份、安全更新、監控告警與每月一定額度之內容修改。",
            "每月之內容修改時數不累積至次月，亦不折換現金。",
            "本公司於台灣工作日 10:00–18:00 收受服務請求，一般於一個工作日內回覆；緊急事故（網站無法存取、資料外洩疑慮）不受此限，將優先處理。",
            "目標可用率為每月 99.5%，但不含第三方服務中斷、客戶自行變更、DDoS 攻擊與例行維護時間。未達目標時本公司將檢討改善，惟不因此負賠償責任。",
            "備份保留 30 日，得依您的要求還原；因客戶自行操作造成之資料損毀，還原作業依維護時數計算。",
          ],
        },
        {
          h: "六、客戶配合義務與內容責任",
          body: [
            "客戶應提供專案所需之文字、圖片、影音素材與必要之帳號權限，並保證擁有合法使用權或已取得授權。因素材延遲提供導致之時程延宕，不可歸責於本公司。",
            "客戶對其於網站上刊載之一切內容負完全責任，並保證不侵害他人權利、不違反法令。",
            "網站置於本公司管理之主機或子網域者，本公司為法律上之「網路服務提供者」，於接獲檢舉或發現內容涉及違法（如侵權、詐欺、色情、賭博）時，得先行移除或暫停該內容並同時通知客戶。",
          ],
        },
        {
          h: "七、智慧財產權與原始碼歸屬",
          body: [
            "建置服務之款項付清後，本公司為您客製之網站程式碼、設計稿與內容之著作財產權移轉予客戶，客戶得自由使用、修改、移轉至任何主機商，不受維護方案是否存續之影響。",
            "前項不包含本公司之開發框架、共用元件庫、工具與既有技術（下稱「共用元件」）。共用元件之著作權仍屬本公司所有，並就您的網站授予永久、不可撤銷、免權利金之使用授權，範圍及於後續之修改與移轉；但客戶不得將共用元件單獨抽出販售或再授權。",
            "網站使用之第三方套件、字型、圖庫依其各自之授權條款，本公司於交付時一併說明。",
            "本公司得將專案成果列為作品集展示；客戶得以書面要求匿名或不予展示。",
            "促銷方案就原始碼另有約定者，以該方案之條款為準。",
          ],
        },
        {
          h: "八、資料主權與服務終止後之處理",
          body: [
            "網站蒐集之表單資料、訂單資料等營運資料，所有權歸客戶。您得隨時於後台以 CSV 格式匯出，本公司不以任何方式限制。",
            "維護終止後，本公司提供 30 日之資料匯出期間；期滿後得刪除主機上之資料與備份。",
            "使用本公司子網域者，終止後免費保留 301 轉址 6 個月，供您將流量導向新網址。",
            "以客戶自有網域者，網域所有權自始屬於客戶，終止時本公司配合完成解析變更或移轉，不另收費。",
          ],
        },
        {
          h: "九、逾期繳款、暫停與終止",
          body: [
            "維護月費扣款失敗時，本公司將以 Email 通知並提供更新付款方式之連結。",
            "扣款失敗後，本公司將依下列時程以 Email 通知：第 3 日提醒、第 7 日預告暫停、第 15 日暫停、第 30 日終止。",
            "自扣款失敗日起逾 15 日仍未完成付款者，本公司得暫停服務，此期間網站不對外提供服務（顯示暫停頁面），備份、監控與修改服務一併停止；逾 30 日者，本公司得終止契約並依前條處理資料。",
            "暫停期間您的資料完整保留，且仍可自客戶後台匯出，不因暫停而受限制（見第八條）。完成付款後，本公司一般於一個工作日內恢復服務。",
            "客戶得隨時終止維護訂閱：於「訂單查詢」找到訂單後點「管理訂閱」自助終止，或來信、LINE 告知。終止之效力與費用計算依退款政策。",
            "任一方重大違約且經催告後 14 日內未改正者，他方得終止契約。",
          ],
        },
        {
          h: "十、退款",
          body: ["退款條件、範圍與作業時程，依本站「退款政策」之約定辦理，該政策為本條款之一部分。"],
        },
        {
          h: "十一、保密",
          body: [
            "雙方對於因履行本契約而知悉之他方營業秘密、客戶資料、技術資訊負保密義務，非經他方書面同意不得洩漏，本義務於契約終止後仍繼續有效 3 年。",
          ],
        },
        {
          h: "十二、免責與責任限制",
          body: [
            "本公司就本契約所生之全部賠償責任，以請求事由發生前 12 個月內客戶實際支付予本公司之金額為上限。",
            "本公司不就間接損害、營業損失、利潤損失或資料滅失所生之衍生性損害負責，但因本公司故意或重大過失者不在此限。",
            "AI 相關服務（如 AI 客服、自動化流程）之產出具有機率性質，本公司不保證其正確性；涉及重要決策時客戶應自行複核。",
          ],
        },
        {
          h: "十三、不可抗力",
          body: [
            "因天災、戰爭、疫情、政府命令、電信或雲端服務商中斷等不可歸責於雙方之事由致無法履約者，義務暫停，雙方均不負遲延責任；持續逾 30 日者，任一方得終止契約並就未履行部分結算。",
          ],
        },
        {
          h: "十四、條款變更與版本",
          body: [
            "本公司得修訂本條款，並於本頁公告新版本。",
            "**新版條款僅對其生效後成立之訂單有效**；您既有之訂單與訂閱，仍適用您下單當時同意之版本，不因本條款嗣後修訂而變更。",
            `本公司於您下單時記錄您同意之條款版本、時間與內容識別碼，並於訂單確認信中一併載明；您得隨時來信 ${SITE.email} 索取當時之條款全文。`,
          ],
        },
        {
          h: "十五、消費者權益之特別說明",
          body: [
            "本公司之服務主要提供予企業與營業主體。若您係以個人消費目的訂購而屬消費者保護法所稱之消費者，本項說明適用於您。",
            "本公司之建置服務屬「依消費者要求所為之客製化給付」，依通訊交易解除權合理例外情事適用準則第二條第一項第四款，**不適用七日無條件解約之規定**。本說明於您結帳前即已揭露。",
            "維護方案為持續性給付之服務，您得依前述條款隨時終止。",
          ],
        },
        {
          h: "十六、準據法與管轄",
          body: [
            "本條款之解釋與適用，以中華民國法律為準據法。因本契約所生之爭議，雙方同意先行協商；協商不成時，以臺灣臺北地方法院為第一審管轄法院。",
          ],
        },
      ],
    },
    en: {
      updated: LEGAL_VERSION,
      sections: [
        {
          h: "1. Provider & Scope",
          body: [
            `This site is operated by ${COMPANY.legalName} (Taiwan unified business number ${COMPANY.taxId}), trading as "${SITE.name}" ("the Company"), providing web development, enterprise AI automation, and systems integration services.`,
            `Registered address: ${COMPANY.address}. Telephone: ${COMPANY.phoneDisplay}. Support: ${SITE.email} (same mailbox as our registered email ${COMPANY.registeredEmail}). LINE: ${SITE.lineId}.`,
            "These Terms apply to all services ordered through this site. By checking the agreement box at checkout you enter into a contract with the Company; we record the version of these Terms you agreed to and the time of agreement as the basis of both parties' rights and obligations.",
            "In these Terms, \"Build Services\" means one-time delivered projects (websites, AI applications, automation workflows); \"Care Plan\" means the monthly hosting, backup, monitoring and content-editing service.",
          ],
        },
        {
          h: "2. Orders & Payment",
          body: [
            "Listed prices are in TWD excluding tax; 5% VAT is added at checkout. Payments are processed by ECPay; both one-time fees and care subscriptions are paid by credit card.",
            "Build Services require an accompanying Care Plan. The build fee and the care subscription are two separate authorizations: the build fee (or, for promotional plans, the seat deposit) is collected at checkout; care is billed from the day your site goes live and is accepted by you, and is authorized as a recurring card payment after that date, with the first charge made at authorization and monthly charges thereafter. Nothing is billed monthly during production.",
            "A promotional plan's seat deposit is collected at checkout to hold your seat and book production. It is credited in full to your first month once the site is live and accepted, and is refunded in full if we fail to deliver for reasons attributable to the Company.",
            "Pricing is published and non-negotiable. Custom projects receive a written fixed quote after a free consultation, and work begins only once both parties confirm it.",
            "Your care rate stays fixed for as long as your subscription runs; any future price change applies only to new orders.",
          ],
        },
        {
          h: "3. Minimum Term & Renewal",
          body: [
            "For orders that include a Build Service, the Care Plan carries a 12-month minimum term starting from the date the site goes live and is accepted. This reflects that build work is delivered well below market rates, with ongoing care forming part of the consideration.",
            "A Care Plan purchased on its own (without a Build Service) has no minimum term and may be cancelled at any time.",
            "Promotional plans carry their own terms and conditions as published on the pricing page, which prevail over this section.",
            "After the minimum term the plan continues month to month and may be cancelled at any time, effective from the next billing cycle.",
            "If you cancel within the minimum term, the Company may claim the unamortized portion of the build fee. Promotional plans spread the standard NT$39,000 build fee across the term, so leaving early means settling what has not yet been amortized, by the number of periods charged: 0–5 periods NT$30,000; 6–11 NT$20,000; 12–17 NT$10,000; 18–23 NT$5,000; nil from period 24.",
            "That amount is unamortized build work, not a penalty, and does not include fees for months not yet served — we do not charge for service we have not provided. It does not apply where termination is due to the Company's failure to perform.",
          ],
        },
        {
          h: "4. Process & Delivery",
          body: [
            "Build Services follow: discovery → design approval → development → acceptance testing → deployment. Typical delivery is 1–2 months after payment and receipt of all materials; the actual schedule is confirmed in writing after discovery.",
            "Acceptance is based on the agreed requirements list. If no written objection is raised within 7 days of delivery, the work is deemed accepted.",
            "Bug fixes are free for 14 days after launch. Later fixes, or anything constituting a change of requirements, are handled under your Care Plan hours or quoted separately.",
            "The design stage includes two rounds of revisions; further rounds use Care Plan hours or are quoted separately.",
          ],
        },
        {
          h: "5. Care Plan Scope & Service Levels",
          body: [
            "Your Care Plan covers the items listed for that plan on the pricing page, generally including hosting, SSL, daily automated backups, security updates, uptime monitoring and a monthly allowance of content edits.",
            "Unused monthly edit hours do not roll over and have no cash value.",
            "Requests are received on Taiwan business days 10:00–18:00 and normally answered within one business day. Emergencies (site unreachable, suspected data breach) are prioritized outside these hours.",
            "The target availability is 99.5% per month, excluding third-party outages, customer-side changes, DDoS attacks and scheduled maintenance. Failing to meet the target triggers a review but does not create a liability for damages.",
            "Backups are retained for 30 days and can be restored on request; restoring data lost through customer action is billed against Care Plan hours.",
          ],
        },
        {
          h: "6. Customer Obligations & Content Responsibility",
          body: [
            "You will supply the text, images, media and account access the project needs, and warrant that you hold the rights to use them. Delays caused by late materials are not attributable to the Company.",
            "You are solely responsible for all content published on your site and warrant that it infringes no rights and breaks no laws.",
            "Where your site is hosted on the Company's infrastructure or subdomain, the Company acts as an internet service provider under Taiwanese law and may remove or suspend content that is reported or found to be unlawful (infringement, fraud, adult content, gambling), notifying you at the same time.",
          ],
        },
        {
          h: "7. Intellectual Property & Source Code",
          body: [
            "Once the build fee is paid in full, ownership of the custom site code, design files and content created for you transfers to you. You may use, modify and move it to any host, regardless of whether your Care Plan continues.",
            "This does not include the Company's development frameworks, shared component libraries, tooling and pre-existing technology (\"Shared Components\"). The Company retains copyright in Shared Components and grants you a perpetual, irrevocable, royalty-free licence to use them within your site, including after modification or migration; you may not extract, resell or sublicense Shared Components on their own.",
            "Third-party packages, fonts and stock assets remain subject to their own licences, which we document at handover.",
            "The Company may feature the project in its portfolio; you may request anonymity or exclusion in writing.",
            "Where a promotional plan states different source-code terms, those terms prevail.",
          ],
        },
        {
          h: "8. Data Ownership & What Happens After Termination",
          body: [
            "Operational data collected by your site (form submissions, orders and similar) belongs to you. You can export it as CSV from your dashboard at any time, without restriction.",
            "After care ends, you have 30 days to export your data, after which the Company may delete data and backups from its servers.",
            "If your site runs on a Company subdomain, we keep a 301 redirect in place free of charge for 6 months after termination so you can move traffic to your new address.",
            "If your site runs on your own domain, that domain is yours throughout, and we will assist with DNS changes or transfer at no cost on termination.",
          ],
        },
        {
          h: "9. Late Payment, Suspension & Termination",
          body: [
            "If a care charge fails, we notify you by email with a link to update your payment method.",
            "After a failed charge we email you on the following schedule: a reminder on day 3, a suspension notice on day 7, suspension on day 15, and termination on day 30.",
            "If payment remains outstanding 15 days after the failed charge, the Company may suspend service: the site stops serving visitors (a suspension page is shown) and backups, monitoring and edits stop. After 30 days, the Company may terminate the agreement and handle your data as described above.",
            "During suspension your data is fully retained and remains exportable from your dashboard (see section 8). Service is normally restored within one business day of payment.",
            "You may cancel your care subscription at any time: find your order under \"Order Lookup\" and use \"Manage\", or email or LINE us. The effect and fees are governed by the Refund Policy.",
            "Either party may terminate if the other materially breaches these Terms and fails to remedy it within 14 days of notice.",
          ],
        },
        {
          h: "10. Refunds",
          body: ["Refund conditions, scope and timing are governed by the Refund Policy on this site, which forms part of these Terms."],
        },
        {
          h: "11. Confidentiality",
          body: [
            "Each party will keep confidential the other's trade secrets, customer data and technical information learned through this agreement, and will not disclose them without written consent. This obligation survives termination for 3 years.",
          ],
        },
        {
          h: "12. Disclaimers & Limitation of Liability",
          body: [
            "The Company's total liability under this agreement is capped at the amount you actually paid the Company in the 12 months preceding the event giving rise to the claim.",
            "The Company is not liable for indirect, consequential, business or profit losses, or for data loss, except where caused by the Company's wilful misconduct or gross negligence.",
            "AI-based services (AI support agents, automation) are probabilistic by nature and their output is not guaranteed to be correct; you should verify it independently before relying on it for significant decisions.",
          ],
        },
        {
          h: "13. Force Majeure",
          body: [
            "Where performance is prevented by events outside either party's control (natural disaster, war, epidemic, government order, telecom or cloud provider outage), obligations are suspended and neither party is liable for the delay. If it continues beyond 30 days, either party may terminate and settle the unperformed portion.",
          ],
        },
        {
          h: "14. Changes & Versioning",
          body: [
            "The Company may revise these Terms and will publish the new version on this page.",
            "**A new version applies only to orders placed after it takes effect.** Your existing orders and subscriptions remain governed by the version you agreed to at the time of purchase.",
            `We record the version, time and content identifier of the Terms you agreed to, and state them in your order confirmation email. You may request the full text of that version at any time at ${SITE.email}.`,
          ],
        },
        {
          h: "15. Note for Consumers",
          body: [
            "The Company's services are provided primarily to businesses. This section applies if you order as an individual for personal purposes and therefore qualify as a consumer under Taiwan's Consumer Protection Act.",
            "Build Services are customized performance made to the customer's specification. Under Article 2(1)(4) of the Regulations on Reasonable Exceptions to the Right of Rescission in Distance Sales, **the 7-day unconditional cancellation right does not apply**. This is disclosed to you before checkout.",
            "Care Plans are continuing services and may be cancelled at any time as described above.",
          ],
        },
        {
          h: "16. Governing Law & Jurisdiction",
          body: [
            "These Terms are governed by the laws of the Republic of China (Taiwan). The parties will first attempt to resolve any dispute by negotiation; failing that, the Taiwan Taipei District Court shall be the court of first instance.",
          ],
        },
      ],
    },
  },
  privacy: {
    "zh-TW": {
      updated: LEGAL_VERSION,
      sections: [
        {
          h: "一、蒐集之個人資料",
          body: [
            "您下單或填寫諮詢表單時，本站蒐集：姓名、Email、電話／LINE ID、公司名稱、統一編號（選填）、訂單與付款狀態紀錄。",
            "為留存契約成立之證據，本站另記錄您同意條款時的時間、來源 IP 位址與同意之條款版本。",
          ],
        },
        {
          h: "二、利用目的",
          body: [
            "上述資料僅用於：訂單處理與履約、開立發票、客戶服務聯繫、契約成立與內容之證明、依法令保存交易紀錄。本站不會將您的資料出售或提供予無關第三方。",
          ],
        },
        {
          h: "三、金流資訊",
          body: [
            "信用卡號等支付資訊由綠界科技 ECPay 於其安全頁面處理，本站不經手、不儲存任何卡號資料。",
          ],
        },
        {
          h: "四、Cookie 與分析",
          body: [
            "本站使用必要之 Cookie 維持購物車與登入狀態，並可能使用 Google Analytics 進行匿名流量分析。",
          ],
        },
        {
          h: "五、保存與您的權利",
          body: [
            `交易紀錄（含同意紀錄）依稅法與舉證需要保存至少 5 年。您得隨時來信 ${SITE.email} 行使查詢、更正、刪除（法令要求保存者除外）之權利。`,
          ],
        },
      ],
    },
    en: {
      updated: LEGAL_VERSION,
      sections: [
        {
          h: "1. Data We Collect",
          body: [
            "When you order or submit an inquiry, we collect: name, email, phone/LINE ID, company name, tax ID (optional), and order/payment records.",
            "To evidence the formation of the contract, we also record the time you accepted the Terms, your source IP address, and the version accepted.",
          ],
        },
        {
          h: "2. Purpose of Use",
          body: [
            "Data is used solely for order fulfillment, invoicing, customer service, evidencing the contract and its content, and legally required record-keeping. We never sell your data or share it with unrelated third parties.",
          ],
        },
        {
          h: "3. Payment Data",
          body: [
            "Card details are processed entirely on ECPay's secure pages. This site never handles or stores card numbers.",
          ],
        },
        {
          h: "4. Cookies & Analytics",
          body: [
            "We use essential cookies for the cart and admin sessions, and may use Google Analytics for anonymized traffic analysis.",
          ],
        },
        {
          h: "5. Retention & Your Rights",
          body: [
            `Transaction records, including consent records, are retained for at least 5 years for tax and evidentiary purposes. Contact ${SITE.email} anytime to access, correct, or delete your data (except records we must legally retain).`,
          ],
        },
      ],
    },
  },
  refund: {
    "zh-TW": {
      updated: LEGAL_VERSION,
      sections: [
        {
          h: "一、一次性建置服務",
          body: [
            "專案開工（需求訪談完成並開始設計／開發）前申請退款：全額退還，僅扣除金流手續費。",
            "開工後申請退款：依已完成工作比例計算費用後退還餘額，由雙方確認工作清單。",
            "交付並驗收完成後恕不退款；上線後 14 日內錯誤修正免費。",
            "建置服務屬依您要求所為之客製化給付，不適用通訊交易七日無條件解約之規定（詳見服務條款第十五條）。",
          ],
        },
        {
          h: "二、月費維護訂閱",
          body: [
            "您可隨時取消訂閱：於「訂單查詢」找到您的訂單後點「管理訂閱」即可自助終止，或來信、LINE 告知亦可。已扣之當期費用不退，自次一期停止扣款。",
            "首次訂閱 7 日內若服務尚未開始提供，可申請全額退款。促銷方案之席次保留金，於網站上線交付前均可申請全額退還（已進行之設計與開發工作依比例計費後退還餘額）。",
            "含建置服務之訂單有 12 個月最短承諾期（促銷方案依其公告條款）。承諾期內提前終止者，原則上不退還已扣款項，且本公司得請求補付尚未攤提完畢之建置費（級距見服務條款第三條：0–5 期 NT$30,000／6–11 期 NT$20,000／12–17 期 NT$10,000／18–23 期 NT$5,000／滿 24 期 0 元）；本公司不就尚未提供之月份收費。因本公司未能履行服務致終止者，不在此限。實際情形歡迎先與我們聯繫，多數狀況都能協議解決。",
          ],
        },
        {
          h: "三、網站健檢服務",
          body: ["健檢報告交付後恕不退款；報告費用可全額折抵 30 日內成立之後續建置服務。"],
        },
        {
          h: "四、退款方式與時程",
          body: [
            `退款以原信用卡刷退方式退回，於確認後 14 個工作天內完成。申請請來信 ${SITE.email} 並附訂單編號。`,
          ],
        },
        {
          h: "五、爭議處理",
          body: [
            `對帳款有疑義時，請先來信 ${SITE.email} 或以 LINE 與我們聯繫，我們會在一個工作天內回覆。直接向發卡機構提出爭議請款前，請先給我們處理的機會——多數狀況是可以直接解決的。`,
          ],
        },
      ],
    },
    en: {
      updated: LEGAL_VERSION,
      sections: [
        {
          h: "1. One-time Build Services",
          body: [
            "Before work begins (discovery completed and design/development started): full refund less payment processing fees.",
            "After work begins: refund of the remaining balance after deducting completed work, based on a mutually confirmed work list.",
            "No refund after delivery and acceptance; bug fixes are free for 14 days after launch.",
            "Build Services are customized to your specification and are therefore exempt from the 7-day unconditional cancellation right for distance sales (see Terms, section 15).",
          ],
        },
        {
          h: "2. Monthly Care Subscriptions",
          body: [
            "Cancel anytime: find your order under \"Order Lookup\" and use \"Manage\" to cancel it yourself, or just email or LINE us. The current billed month is non-refundable; charging stops from the next cycle.",
            "Within 7 days of first subscribing, a full refund is available if service has not yet started. A promotional plan's seat deposit is fully refundable any time before the site is delivered (less a pro-rata charge for design and development already carried out).",
            "Orders that include a Build Service carry a 12-month minimum term (promotional plans follow their published terms). Cancelling within the minimum term does not entitle you to a refund of amounts already charged, and the Company may claim the unamortized build fee (tiers in Terms section 3: NT$30,000 for 0–5 periods / NT$20,000 for 6–11 / NT$10,000 for 12–17 / NT$5,000 for 18–23 / nil from 24). We do not charge for months not yet served. This does not apply where termination is due to the Company's failure to perform. Talk to us first; most situations can be settled by agreement.",
          ],
        },
        {
          h: "3. Website Health Check",
          body: [
            "Non-refundable once the report is delivered; the fee is fully creditable toward any build service ordered within 30 days.",
          ],
        },
        {
          h: "4. Method & Timing",
          body: [
            `Refunds are issued to the original credit card within 14 business days of confirmation. Email ${SITE.email} with your order number to request.`,
          ],
        },
        {
          h: "5. Billing Disputes",
          body: [
            `If something on your statement looks wrong, email ${SITE.email} or message us on LINE first — we reply within one business day. Please give us a chance to fix it before filing a chargeback with your card issuer; most cases are resolved directly.`,
          ],
        },
      ],
    },
  },
};

export type { DocKey };
