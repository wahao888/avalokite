import type { Metadata } from "next";
import Link from "next/link";
import WorksList from "../_components/WorksList";
import Reveal from "../_components/Reveal";
import { listPast, listUpcoming } from "../_data/events";
import { ML } from "../_data/site";

export const metadata: Metadata = {
  title: "活動與合作",
  description:
    "Monsieur Long 隆先生的品牌聯名、市集擺攤、快閃活動與企業合作紀錄。冰淇淋櫃可以搬到需要它的地方——市集、聯名、公司活動、Private Event 都能談。",
  alternates: { canonical: "/events" },
};

export default async function EventsPage() {
  const [upcoming, past] = await Promise.all([listUpcoming(), listPast()]);

  return (
    <>
      <section className="ml-sec ml-sec--tight">
        <div className="ml-wrap">
          <Reveal>
            <div className="ml-head">
              <p className="ml-eyebrow">Events &amp; Collaborations</p>
              <h1 className="ml-h2">
                冰淇淋櫃
                <br />
                可以搬到任何地方
              </h1>
              <p className="ml-lede">
                我們去過精品香水的品牌之夜，也在河堤邊擺過攤等煙火。
                只要現場能放得下一個櫃子，就能做。
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="ml-sec ml-sec--tight ml-sec--paper2">
        <div className="ml-wrap">
          <Reveal>
            <div className="ml-head">
              <p className="ml-eyebrow">Upcoming</p>
              <h2 className="ml-h3">即將登場</h2>
            </div>
            <WorksList events={upcoming} />
          </Reveal>
        </div>
      </section>

      <section className="ml-sec ml-sec--ink">
        <div className="ml-wrap">
          <Reveal>
            <div className="ml-head">
              <div className="ml-head-row">
                <div>
                  <p className="ml-eyebrow">Selected Works</p>
                  <h2 className="ml-h2" style={{ marginTop: 12, color: "var(--ml-paper)" }}>
                    做過的事
                  </h2>
                </div>
                <span className="ml-count" style={{ color: "var(--ml-stone)" }}>
                  {past.length} 場
                </span>
              </div>
            </div>
            <WorksList events={past} />
          </Reveal>

          <Reveal delay={0.1}>
            <div
              style={{
                marginTop: 40,
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <Link href={`${ML}/collab`} className="ml-btn ml-btn--yellow">
                提出合作邀請
              </Link>
              <span style={{ color: "#C9C0AD", fontSize: 14 }}>
                告訴我們日期、地點與人數，其餘的一起想。
              </span>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
