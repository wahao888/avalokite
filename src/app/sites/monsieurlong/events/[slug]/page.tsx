import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Reveal from "../../_components/Reveal";
import WorksList from "../../_components/WorksList";
import {
  EVENT_KIND_ZH,
  eventSlugs,
  getEvent,
  isUpcoming,
  listEvents,
} from "../../_data/events";
import { ML, SITE } from "../../_data/site";

export async function generateStaticParams() {
  return (await eventSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const e = await getEvent(slug);
  if (!e) return { title: "找不到這場活動" };

  return {
    title: e.title,
    description: `${e.summary}｜${e.dateLabel}・${e.venue}。Monsieur Long 隆先生的${EVENT_KIND_ZH[e.kind]}紀錄。`,
    alternates: { canonical: `/events/${e.slug}` },
    openGraph: { title: `${e.title}｜Monsieur Long 隆先生`, description: e.summary, type: "article" },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [event, all] = await Promise.all([getEvent(slug), listEvents()]);
  if (!event) notFound();

  const others = all.filter((e) => e.slug !== event.slug).slice(0, 3);
  const upcoming = isUpcoming(event);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.summary,
    ...(event.start ? { startDate: event.start } : {}),
    ...(event.end ? { endDate: event.end } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venue,
      address: { "@type": "PostalAddress", addressLocality: event.city ?? "台北市", addressCountry: "TW" },
    },
    performer: { "@type": "Organization", name: SITE.name },
    organizer: event.partner ? { "@type": "Organization", name: event.partner } : undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section
        className="ml-ehero"
        style={{ ["--ml-accent" as string]: event.color } as React.CSSProperties}
      >
        <div className="ml-wrap ml-ehero-in">
          <nav className="ml-crumb" aria-label="麵包屑">
            <Link href={`${ML}/events`}>← 活動與合作</Link>
          </nav>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            <span className="ml-tag">{EVENT_KIND_ZH[event.kind]}</span>
            {upcoming && <span className="ml-tag ml-tag--limited">即將登場</span>}
            {event.partner && <span className="ml-tag">× {event.partner}</span>}
          </div>

          <h1 className="ml-ehero-title">{event.title}</h1>
          {event.titleEn && (
            <p className="ml-en" style={{ fontSize: 20, marginTop: 10, color: "var(--ml-ink-2)" }}>
              {event.titleEn}
            </p>
          )}

          <div className="ml-meta-row">
            <span>
              <b>日期</b>
              {event.dateLabel}
            </span>
            <span>
              <b>地點</b>
              {event.venue}
              {event.city ? `・${event.city}` : ""}
            </span>
            <span>
              <b>類型</b>
              {EVENT_KIND_ZH[event.kind]}
            </span>
            {event.partner && (
              <span>
                <b>合作對象</b>
                {event.partner}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="ml-sec ml-sec--tight ml-sec--paper2">
        <div className="ml-wrap ml-split">
          <Reveal>
            <p className="ml-eyebrow">現場</p>
            <div className="ml-prose" style={{ marginTop: 18 }}>
              {event.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {event.links && event.links.length > 0 && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
                {event.links.map((l) => (
                  <a
                    key={l.url}
                    className="ml-btn ml-btn--ghost"
                    href={l.url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {l.label} ↗
                  </a>
                ))}
              </div>
            )}
          </Reveal>

          <Reveal delay={0.08}>
            <ul className="ml-notes" style={{ marginTop: 0 }}>
              {event.tags.map((t) => (
                <li className="ml-note-chip" key={t}>
                  {t}
                </li>
              ))}
            </ul>

            <div
              className="ml-quote"
              style={{ marginTop: 26, borderLeftColor: event.color }}
            >
              <p>想在你的活動裡放一個冰淇淋櫃？</p>
              <cite>市集・聯名・公司活動・Private Event</cite>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
              <Link href={`${ML}/collab`} className="ml-btn ml-btn--primary">
                提出合作邀請
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="ml-sec ml-sec--tight">
        <div className="ml-wrap">
          <Reveal>
            <div className="ml-head">
              <p className="ml-eyebrow">其他場次</p>
            </div>
            <WorksList events={others} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
