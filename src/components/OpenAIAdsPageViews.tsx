"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { measureOpenAIAds } from "@/lib/track";

export default function OpenAIAdsPageViews({ paths }: { paths: string[] }) {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === previousPath.current) return;
    previousPath.current = pathname;
    if (!paths.includes(pathname)) return;

    measureOpenAIAds("page_viewed", {
      type: "contents",
      contents: [{ id: pathname, content_type: "page" }],
    });
  }, [pathname, paths]);

  return null;
}
