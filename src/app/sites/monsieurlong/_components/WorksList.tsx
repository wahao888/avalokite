import Link from "next/link";
import { EVENT_KIND_ZH, type EventItem } from "../_data/events";
import { ML } from "../_data/site";

/**
 * 活動列表。刻意做成事務所的作品集索引（日期／標題／場地一排到底），
 * 而不是新聞稿卡片牆——過去的合作要看起來像是「做過的事」，
 * 而不是「發過的公告」。
 */
export default function WorksList({ events }: { events: EventItem[] }) {
  if (events.length === 0) {
    return (
      <p className="ml-lede" style={{ paddingBlock: 26 }}>
        目前沒有排定的活動。想邀請我們出攤或聯名，
        <Link href={`${ML}/collab`} className="ml-link" style={{ marginLeft: 6 }}>
          由此開始
        </Link>
      </p>
    );
  }

  return (
    <ul className="ml-works">
      {events.map((e) => (
        <li key={e.slug}>
          <Link
            href={`${ML}/events/${e.slug}`}
            className="ml-work"
            style={{ ["--ml-work-color" as string]: e.color }}
            data-scoop-color={e.color}
          >
            <span className="ml-work-sweep" aria-hidden="true" />
            <span className="ml-work-date">{e.dateLabel}</span>
            <span>
              <span className="ml-work-title">{e.title}</span>
              {e.titleEn && <span className="ml-work-en">{e.titleEn}</span>}
            </span>
            <span className="ml-work-meta">
              <span className="ml-work-kind">{EVENT_KIND_ZH[e.kind]}</span>
              <span>
                {e.venue}
                {e.city ? `・${e.city}` : ""}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
