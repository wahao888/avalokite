import Doodle from "@/components/Doodle";
import { TRUST_MARKS } from "@/lib/trust";

export default function TrustMarks({ locale }: { locale: string }) {
  const items = TRUST_MARKS[locale === "en" ? "en" : "zh-TW"];
  return (
    <ul className="trust-marks">
      {items.map((x) => (
        <li key={x.t}>
          <Doodle name={x.icon} size={44} />
          <strong>{x.t}</strong>
          <span>{x.d}</span>
        </li>
      ))}
    </ul>
  );
}
