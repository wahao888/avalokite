import type { FaqItem } from "@/lib/faq";

export default function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="faq-list">
      {items.map((x) => (
        <details key={x.q} className="faq-item">
          <summary>{x.q}</summary>
          <p>{x.a}</p>
        </details>
      ))}
    </div>
  );
}
