import type { Metadata } from "next";
import InquiryForm from "../_components/InquiryForm";
import Reveal from "../_components/Reveal";
import { listPast } from "../_data/events";
import WorksList from "../_components/WorksList";

export const metadata: Metadata = {
  title: "合作邀請",
  description:
    "邀請 Monsieur Long 隆先生參與你的活動：品牌聯名、市集邀請、快閃活動、公司活動、Private Event 與 Catering。留下日期、地點與規模，我們會盡快回覆。",
  alternates: { canonical: "/collab" },
};

const STEPS = [
  { k: "01", t: "留下需求", d: "填完下面的表單。日期與地點如果還沒確定，寫大概的範圍就好。" },
  { k: "02", t: "我們回信", d: "幾個工作天內回覆可行性、可以出的口味、需要的場地條件與報價方式。" },
  { k: "03", t: "現場執行", d: "冰淇淋櫃、器具與人力我們自己帶。你只要準備好一個位置與電源。" },
];

export default async function CollabPage() {
  const past = await listPast();

  return (
    <>
      <section className="ml-sec ml-sec--tight">
        <div className="ml-wrap">
          <Reveal>
            <div className="ml-head">
              <p className="ml-eyebrow">Collaboration Inquiry</p>
              <h1 className="ml-h2">
                想在你的活動裡
                <br />
                放一個冰淇淋櫃？
              </h1>
              <p className="ml-lede">
                品牌聯名、市集、快閃、公司活動、Private Event、Catering 都可以談。
                告訴我們日期、地點與大概的人數，其餘的一起想。
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <ol className="ml-works" style={{ marginBottom: 8 }}>
              {STEPS.map((s) => (
                <li key={s.k} className="ml-work" style={{ cursor: "default" }}>
                  <span className="ml-work-date">{s.k}</span>
                  <span>
                    <span className="ml-work-title" style={{ fontSize: "clamp(19px,2.4vw,26px)" }}>
                      {s.t}
                    </span>
                  </span>
                  <span className="ml-work-meta">{s.d}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      <section className="ml-sec ml-sec--tight ml-sec--paper2">
        <div className="ml-wrap">
          <Reveal>
            <div className="ml-head">
              <p className="ml-eyebrow">Form</p>
              <h2 className="ml-h3">合作邀請表單</h2>
            </div>
            <InquiryForm kind="collab" />
          </Reveal>
        </div>
      </section>

      <section className="ml-sec ml-sec--tight">
        <div className="ml-wrap">
          <Reveal>
            <div className="ml-head">
              <p className="ml-eyebrow">參考</p>
              <h2 className="ml-h3">我們做過這些</h2>
            </div>
            <WorksList events={past.slice(0, 4)} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
