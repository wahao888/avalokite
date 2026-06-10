// 法務頁內容（綠界特約商店審核必備：服務價格、聯絡方式、退款政策需公開）
import { SITE } from "./site";

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
      updated: "2026-06-10",
      sections: [
        {
          h: "一、服務提供者",
          body: [
            `本網站由 Avalo 阿瓦羅工作室（下稱「本工作室」）經營，提供網站設計開發、企業 AI 自動化、系統整合等數位服務。聯絡方式：${SITE.email}、LINE ${SITE.lineId}。`,
          ],
        },
        {
          h: "二、訂購與付款",
          body: [
            "網站上標示之價格均為新台幣未稅價，結帳時加計 5% 營業稅。付款透過綠界科技 ECPay 處理，支援信用卡、ATM 轉帳與超商代碼。",
            "月費方案採信用卡定期定額，授權後每月自動扣款；您可隨時依退款政策取消，停扣自次一期生效。",
            "本工作室採公開定價、不二價原則；客製專案於免費諮詢後提供書面固定報價。",
          ],
        },
        {
          h: "三、服務流程與交付",
          body: [
            "建置類服務流程：需求訪談 → 設計確認 → 開發 → 測試驗收 → 部署上線。一般於付款後 1–2 個月內完成，實際時程依專案複雜度於訪談後確認。",
            "驗收以雙方確認之需求清單為準；上線後 14 天內之錯誤修正免費。",
          ],
        },
        {
          h: "四、智慧財產權",
          body: [
            "專案款項付清後，交付成果（網站程式碼、設計稿）之使用權歸客戶所有；本工作室保留開發框架、共用元件庫之權利，並得將成果列為作品集展示（可依客戶要求匿名）。",
          ],
        },
        {
          h: "五、客戶義務",
          body: [
            "客戶應提供專案所需之文字、圖片素材與帳號權限，並保證擁有合法使用權。因素材延遲提供導致之時程延宕，不可歸責於本工作室。",
          ],
        },
        {
          h: "六、責任限制",
          body: [
            "本工作室就服務缺失之賠償責任，以該筆訂單實收金額為上限。對於不可抗力（第三方服務中斷、天災等）造成之損失不負賠償責任，但將盡力協助復原。",
          ],
        },
      ],
    },
    en: {
      updated: "2026-06-10",
      sections: [
        {
          h: "1. Service Provider",
          body: [
            `This site is operated by Avalo Studio ("the Studio"), providing web development, enterprise AI automation, and systems integration services. Contact: ${SITE.email}, LINE ${SITE.lineId}.`,
          ],
        },
        {
          h: "2. Orders & Payment",
          body: [
            "Listed prices are in TWD excluding tax; 5% VAT is added at checkout. Payments are processed by ECPay (credit card, ATM transfer, convenience store code).",
            "Subscriptions are charged monthly by credit card after authorization. You may cancel anytime per the Refund Policy; cancellation takes effect from the next billing cycle.",
            "All standard services are fixed-price as published. Custom projects receive a written fixed quote after a free consultation.",
          ],
        },
        {
          h: "3. Process & Delivery",
          body: [
            "Build projects follow: discovery → design approval → development → acceptance testing → deployment. Typical delivery is 1–2 months after payment, confirmed during discovery.",
            "Acceptance is based on the agreed requirements list; bug fixes are free for 14 days after launch.",
          ],
        },
        {
          h: "4. Intellectual Property",
          body: [
            "Upon full payment, usage rights of deliverables (site code, designs) belong to the client. The Studio retains rights to its frameworks and shared component libraries, and may showcase the work in its portfolio (anonymized on request).",
          ],
        },
        {
          h: "5. Client Obligations",
          body: [
            "Clients shall provide required content, assets, and account access, and warrant lawful rights to use them. Delays caused by late materials are not attributable to the Studio.",
          ],
        },
        {
          h: "6. Limitation of Liability",
          body: [
            "The Studio's liability for service defects is capped at the amount actually paid for the order. The Studio is not liable for force majeure (third-party outages, disasters) but will assist with recovery.",
          ],
        },
      ],
    },
  },
  privacy: {
    "zh-TW": {
      updated: "2026-06-10",
      sections: [
        {
          h: "一、蒐集之個人資料",
          body: [
            "您下單或填寫諮詢表單時，本站蒐集：姓名、Email、電話／LINE ID、公司名稱、統一編號（選填）、訂單與付款狀態紀錄。",
          ],
        },
        {
          h: "二、利用目的",
          body: [
            "上述資料僅用於：訂單處理與履約、開立發票、客戶服務聯繫、依法令保存交易紀錄。本站不會將您的資料出售或提供予無關第三方。",
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
            `交易紀錄依稅法保存至少 5 年。您得隨時來信 ${SITE.email} 行使查詢、更正、刪除（法令要求保存者除外）之權利。`,
          ],
        },
      ],
    },
    en: {
      updated: "2026-06-10",
      sections: [
        {
          h: "1. Data We Collect",
          body: [
            "When you order or submit an inquiry, we collect: name, email, phone/LINE ID, company name, tax ID (optional), and order/payment records.",
          ],
        },
        {
          h: "2. Purpose of Use",
          body: [
            "Data is used solely for order fulfillment, invoicing, customer service, and legally required record-keeping. We never sell your data or share it with unrelated third parties.",
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
            `Transaction records are retained for at least 5 years as required by tax law. Contact ${SITE.email} anytime to access, correct, or delete your data (except records we must legally retain).`,
          ],
        },
      ],
    },
  },
  refund: {
    "zh-TW": {
      updated: "2026-06-10",
      sections: [
        {
          h: "一、一次性建置服務",
          body: [
            "專案開工（需求訪談完成並開始設計／開發）前申請退款：全額退還，僅扣除金流手續費。",
            "開工後申請退款：依已完成工作比例計算費用後退還餘額，由雙方確認工作清單。",
            "交付並驗收完成後恕不退款；上線後 14 天內錯誤修正免費。",
          ],
        },
        {
          h: "二、月費訂閱服務",
          body: [
            "您可隨時取消訂閱：來信或 LINE 告知即可，已扣之當期費用不退，自次一期停止扣款。",
            "首次訂閱 7 天內若服務尚未開始提供，可申請全額退款。",
          ],
        },
        {
          h: "三、網站健檢服務",
          body: ["健檢報告交付後恕不退款；報告費用可全額折抵 30 天內成立之後續建置服務。"],
        },
        {
          h: "四、退款方式與時程",
          body: [
            `退款依原付款方式退回（信用卡刷退／轉帳），於確認後 14 個工作天內完成。申請請來信 ${SITE.email} 並附訂單編號。`,
          ],
        },
      ],
    },
    en: {
      updated: "2026-06-10",
      sections: [
        {
          h: "1. One-time Builds",
          body: [
            "Before work begins (discovery completed and design/development started): full refund minus payment processing fees.",
            "After work begins: refund of the remaining balance after deducting completed work, based on a mutually confirmed work list.",
            "No refund after delivery and acceptance; bug fixes are free for 14 days after launch.",
          ],
        },
        {
          h: "2. Monthly Subscriptions",
          body: [
            "Cancel anytime by email or LINE. The current billed month is non-refundable; charging stops from the next cycle.",
            "Within 7 days of first subscribing, a full refund is available if service has not yet started.",
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
            `Refunds are issued via the original payment method within 14 business days of confirmation. Email ${SITE.email} with your order number to request.`,
          ],
        },
      ],
    },
  },
};

export type { DocKey };
