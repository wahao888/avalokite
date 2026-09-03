import Link from "next/link";
import { PROCESS, ROAST, type Bean } from "../_data/beans";
import { FAMILY } from "../_data/flavor-wheel";
import { twd } from "../_data/shop";
import { RK } from "../_data/site";
import BeanArt from "./BeanArt";
import CardAddButton from "./CardAddButton";

/** 豆單卡片。可以直接加一包進購物車，數量到購物車再調。 */
export default function BeanCard({ bean, soldOut = false }: { bean: Bean; soldOut?: boolean }) {
  const fam = FAMILY[bean.families[0]!];

  return (
    <article className={`rk-card${soldOut ? " rk-card--out" : ""}`}>
      <div className="rk-card__no">
        NO.{String(bean.no).padStart(2, "0")}
        <span style={{ margin: "0 8px", opacity: 0.4 }}>/</span>
        {bean.country}
      </div>

      <BeanArt bean={bean} className="rk-card__art" />

      <h3 className="rk-card__name">{bean.nameZh}</h3>
      <p className="rk-card__en">{bean.nameEn}</p>

      <div className="rk-card__notes">
        <span className="rk-tag rk-tag--dot" style={{ ["--dot" as string]: fam.color }}>
          {fam.zh}
        </span>
        <span className="rk-tag">{PROCESS[bean.process].labelZh}</span>
        <span className="rk-tag">{ROAST[bean.roast].labelZh}</span>
      </div>

      <p style={{ fontSize: 13.5, lineHeight: 1.8, color: "var(--rk-mute)", marginTop: 14 }}>
        {bean.notes.join("・")}
      </p>

      <div className="rk-card__foot">
        <div className="rk-price">
          {twd(bean.price)}
          <small>半磅 227G</small>
        </div>
        <CardAddButton slug={bean.slug} soldOut={soldOut} />
      </div>

      {/* 整張卡片可點進單品頁。z-index 低於 foot，所以加入鍵不會被它蓋住。 */}
      <Link className="rk-card__hit" href={`${RK}/beans/${bean.slug}`} aria-label={`${bean.nameZh}，看細節`} />
    </article>
  );
}
