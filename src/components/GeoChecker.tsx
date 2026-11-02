"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { track } from "@/lib/track";

interface Report {
  ok: boolean;
  error?: string;
  origin?: string;
  robots?: { found: boolean; blocked: string[] };
  jsonLd?: boolean;
  llms?: boolean;
  title?: string;
}

export default function GeoChecker() {
  const zh = useLocale() !== "en";
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setReport(null);
    try {
      const res = await fetch("/api/geo-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as Report;
      setReport(data);
      track("tool_geo", { ok: data.ok ? 1 : 0 });
    } catch {
      setReport({ ok: false, error: zh ? "連線失敗，請稍後再試。" : "Request failed. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="tool-panel" onSubmit={run}>
      <label className="form-label" htmlFor="geo-url">
        {zh ? "網站網址" : "Website URL"}
      </label>
      <div className="tool-row">
        <input
          id="geo-url"
          className="form-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
          inputMode="url"
        />
        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? (zh ? "檢查中…" : "Checking…") : zh ? "檢查" : "Check"}
        </button>
      </div>
      {report && (
        <div className={`form-feedback ${report.ok ? "ok" : "err"}`} style={{ marginTop: "1.2rem" }}>
          {report.error && <p>{report.error}</p>}
          {report.ok && (
            <ul className="tool-findings">
              <li>
                robots.txt：
                {report.robots?.found
                  ? report.robots.blocked.length
                    ? zh
                      ? `有擋到 ${report.robots.blocked.join("、")}`
                      : `blocks ${report.robots.blocked.join(", ")}`
                    : zh
                      ? "找得到，沒有擋常見 AI 爬蟲"
                      : "found, common AI crawlers allowed"
                  : zh
                    ? "找不到"
                    : "missing"}
              </li>
              <li>JSON-LD：{report.jsonLd ? (zh ? "有" : "yes") : zh ? "沒有" : "no"}</li>
              <li>llms.txt：{report.llms ? (zh ? "有" : "yes") : zh ? "沒有" : "no"}</li>
              {report.title && <li>title：{report.title}</li>}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
