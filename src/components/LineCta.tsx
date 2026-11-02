"use client";

import { LINE_URL, SITE } from "@/lib/site";
import { track } from "@/lib/track";

export default function LineCta({
  label,
  className = "btn-primary",
}: {
  label: string;
  className?: string;
}) {
  return (
    <a
      href={LINE_URL}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("click_line")}
    >
      {label}
      <span className="line-id">{SITE.lineId}</span>
    </a>
  );
}
