import Link from "next/link";
import ScoopArt from "./ScoopArt";
import Morph from "./Morph";
import { flagsOf, type Flavor } from "../_data/flavors";
import { ML } from "../_data/site";

/**
 * 口味卡。整張是連結，hover / focus 的位移與染色全交給 CSS
 * （transform + opacity，不觸發 layout），所以列表再長也不會卡。
 */
export default function FlavorCard({
  flavor,
  today = false,
  compact = false,
}: {
  flavor: Flavor;
  /** 今天有供應 → 角落多一個標籤 */
  today?: boolean;
  compact?: boolean;
}) {
  const f = flagsOf(flavor);

  return (
    <Link
      href={`${ML}/flavors/${flavor.slug}`}
      className="ml-card"
      style={{ ["--ml-card-color" as string]: flavor.color }}
    >
      <div className="ml-card-tags">
        {today && <span className="ml-tag ml-tag--today">今日供應</span>}
        {f.isNew && <span className="ml-tag ml-tag--new">New</span>}
        {f.isLimited && (
          <span className="ml-tag ml-tag--limited">
            {flavor.badge ?? "限定"}
            {f.daysLeft !== null && f.daysLeft <= 30 ? `・剩 ${f.daysLeft} 天` : ""}
          </span>
        )}
      </div>

      <div className="ml-card-art">
        <div className="ml-card-wash" />
        <Morph name={`scoop-${flavor.slug}`}>
          <ScoopArt flavor={flavor} title={`${flavor.nameZh} 冰淇淋插畫`} />
        </Morph>
      </div>

      <div className="ml-card-body">
        <span className="ml-card-name">{flavor.nameZh}</span>
        <span className="ml-card-en">{flavor.nameEn}</span>
        {!compact && <span className="ml-card-ex">{flavor.excerpt}</span>}
      </div>

      <span className="ml-card-arrow" aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path
            d="M3 11L11 3M11 3H4.5M11 3V9.5"
            stroke="#16130F"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Link>
  );
}
