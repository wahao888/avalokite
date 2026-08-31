import type { Metadata } from "next";
import InquiryForm from "../_components/InquiryForm";
import Reveal from "../_components/Reveal";
import OpenStatus from "../_components/OpenStatus";
import { SITE } from "../_data/site";

export const metadata: Metadata = {
  title: "伴手禮・客製化蛋糕",
  description:
    "Monsieur Long 隆先生的伴手禮禮盒、法式小點與客製化蛋糕，接受預訂與企業送禮。留下需求與希望取貨日，我們會回信確認可行的時間與細節。",
  alternates: { canonical: "/custom" },
};

const OFFERS = [
  {
    k: "禮盒",
    t: "伴手禮禮盒",
    d: "法式小點裝盒，適合帶去別人家、辦公室分享，或當節慶伴手禮。數量與內容可以討論。",
  },
  {
    k: "蛋糕",
    t: "客製化蛋糕",
    d: "生日、紀念日、求婚、公司慶祝。口味、尺寸與上面要寫什麼字都可以指定，需要提前預訂。",
  },
  {
    k: "企業",
    t: "大量訂購與企業送禮",
    d: "尾牙、開幕、年節送禮。數量較大時請盡早聯繫，我們才排得出製作時間。",
  },
];

export default function CustomPage() {
  return (
    <>
      <section className="ml-sec ml-sec--tight">
        <div className="ml-wrap">
          <Reveal>
            <div className="ml-head">
              <p className="ml-eyebrow">Gifts &amp; Custom Cakes</p>
              <h1 className="ml-h2">
                帶一盒走，
                <br />
                或訂一個只有你有的。
              </h1>
              <p className="ml-lede">
                除了櫃上的 Gelato，我們也做法式小點禮盒與客製化蛋糕。
                因為都是現做，需要提前一點時間安排。
              </p>
              <div style={{ marginTop: 6 }}>
                <OpenStatus />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <ul className="ml-works">
              {OFFERS.map((o) => (
                <li key={o.k} className="ml-work" style={{ cursor: "default" }}>
                  <span className="ml-work-date">{o.k}</span>
                  <span>
                    <span className="ml-work-title" style={{ fontSize: "clamp(19px,2.4vw,26px)" }}>
                      {o.t}
                    </span>
                  </span>
                  <span className="ml-work-meta">{o.d}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="ml-form-note" style={{ marginTop: 26, maxWidth: "58ch" }}>
              網站目前不收線上付款——留下需求後我們會回信確認品項、時間與金額，
              再約取貨或出貨方式。急件也可以直接在 Instagram（{SITE.instagramHandle}）私訊。
            </p>
          </Reveal>
        </div>
      </section>

      <section className="ml-sec ml-sec--tight ml-sec--paper2">
        <div className="ml-wrap">
          <Reveal>
            <div className="ml-head">
              <p className="ml-eyebrow">Form</p>
              <h2 className="ml-h3">訂購詢問</h2>
            </div>
            <InquiryForm kind="custom" />
          </Reveal>
        </div>
      </section>
    </>
  );
}
