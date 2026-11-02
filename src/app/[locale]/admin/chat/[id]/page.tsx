import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isAdmin } from "@/lib/admin-auth";
import { MUTE_HOURS } from "@/lib/chat-service";
import { conversationDetail, money } from "@/lib/chat-stats";
import { cellStyle, headStyle, fmtDate } from "../../_table";

export { NOINDEX as metadata } from "@/lib/site-routes";

export const dynamic = "force-dynamic";

const bubble = (mine: boolean): React.CSSProperties => ({
  maxWidth: "min(620px, 86%)",
  marginLeft: mine ? 0 : "auto",
  padding: "0.7rem 0.95rem",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: mine
    ? "color-mix(in srgb, var(--sage) 12%, transparent)"
    : "var(--surface, transparent)",
  fontSize: "0.86rem",
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
});

export default async function AdminChatDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (!(await isAdmin())) redirect("/admin");

  const convo = Number.isInteger(Number(id)) ? await conversationDetail(Number(id)) : null;
  if (!convo) notFound();

  const muted = !!convo.mutedUntil && convo.mutedUntil > new Date();
  const who = convo.displayName ?? convo.externalId;

  return (
    <main className="page-wrap" style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="mono-label">
            ADMIN / 對話 #{convo.id} / {convo.channel === "line" ? "LINE" : "官網"}
          </div>
          <h1 className="section-title">{who}</h1>
        </div>
        <a href="/admin/chat" className="btn-ghost">← AI 客服</a>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <tbody>
          <tr>
            <th style={headStyle}>LINE / 訪客 ID</th>
            <td style={{ ...cellStyle, fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>
              {convo.externalId}
            </td>
            <th style={headStyle}>開始</th>
            <td style={cellStyle}>{fmtDate(convo.createdAt)}</td>
          </tr>
          <tr>
            <th style={headStyle}>狀態</th>
            <td style={cellStyle}>
              {convo.handoff ? (
                <span className="badge failed">待處理</span>
              ) : convo.handoffAt ? (
                <span className="badge replaced">已處理</span>
              ) : (
                <span className="badge active">AI 自動</span>
              )}
              {convo.handoffReason && (
                <>
                  <br />
                  {convo.handoffReason}
                </>
              )}
              {convo.handoffAt && (
                <>
                  <br />
                  <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>
                    首次轉人 {fmtDate(convo.handoffAt)}
                  </span>
                </>
              )}
            </td>
            <th style={headStyle}>AI 靜音</th>
            <td style={cellStyle}>
              {muted ? `至 ${fmtDate(convo.mutedUntil)}` : "未靜音（AI 會自動回覆）"}
            </td>
          </tr>
          <tr>
            <th style={headStyle}>則數</th>
            <td style={cellStyle}>{convo.messages.length}</td>
            <th style={headStyle}>這個對話的模型成本</th>
            <td style={cellStyle}>
              {money(convo.costUsd).usd}（約 {money(convo.costUsd).twd}）
              <br />
              <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>
                輸入 {convo.tokens.input.toLocaleString()}／其中快取{" "}
                {convo.tokens.cacheRead.toLocaleString()}／輸出{" "}
                {convo.tokens.output.toLocaleString()}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: "flex", gap: "0.8rem", marginTop: "1.2rem", flexWrap: "wrap" }}>
        {convo.handoff && (
          <form method="post" action="/api/admin/chat-handoff">
            <input type="hidden" name="id" value={convo.id} />
            <input type="hidden" name="action" value="resolve" />
            <button type="submit" className="btn-primary">標記已處理，AI 接回</button>
          </form>
        )}
        {/* 官網對話不給靜音：handleMessage 只對 LINE 認靜音，按了也只是讓客人沒人理 */}
        {convo.channel === "line" && !muted && (
          <form method="post" action="/api/admin/chat-handoff">
            <input type="hidden" name="id" value={convo.id} />
            <input type="hidden" name="action" value="mute" />
            <button type="submit" className="btn-ghost">
              我自己接（AI 閉嘴 {MUTE_HOURS} 小時）
            </button>
          </form>
        )}
      </div>

      <div className="cart-section-head">逐字稿</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
        {convo.messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div key={m.id}>
              <div style={bubble(isUser)}>{m.content}</div>
              <div
                style={{
                  color: "var(--muted)",
                  fontSize: "0.66rem",
                  fontFamily: "var(--font-mono)",
                  marginTop: "0.25rem",
                  textAlign: isUser ? "left" : "right",
                }}
              >
                {isUser ? "客人" : "AI 客服"}　{fmtDate(m.createdAt)}
                {!isUser && m.inputTokens > 0 && (
                  <>
                    　in {m.inputTokens.toLocaleString()}（快取{" "}
                    {m.cacheReadTokens.toLocaleString()}）／out {m.outputTokens.toLocaleString()}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {convo.messages.length === 0 && <p className="form-note">這個對話還沒有訊息。</p>}
    </main>
  );
}
