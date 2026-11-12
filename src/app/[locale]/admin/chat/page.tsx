import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isAdmin } from "@/lib/admin-auth";
import { DAILY_CAP, MONTHLY_BUDGET, MUTE_HOURS } from "@/lib/chat-service";
import {
  cacheHitRate,
  getKnowledge,
  money,
  monthlyUsage,
  recentConversations,
  type ConversationSummary,
} from "@/lib/chat-stats";
import { getTenant, TENANTS } from "@/lib/tenants";
import { planOf } from "@/lib/ai-plans";
import { cellStyle, headStyle, fmtDate } from "../_table";

export { NOINDEX as metadata } from "@/lib/site-routes";

export const dynamic = "force-dynamic";

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 4,
  padding: "1rem 1.1rem",
  minWidth: 170,
  flex: "1 1 170px",
};

function Card({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={cardStyle}>
      <div className="mono-label" style={{ marginBottom: "0.35rem" }}>{label}</div>
      <div style={{ fontSize: "1.45rem", fontFamily: "var(--font-display)" }}>{value}</div>
      {note && (
        <div style={{ color: "var(--muted)", fontSize: "0.72rem", marginTop: "0.3rem" }}>
          {note}
        </div>
      )}
    </div>
  );
}

/** 一眼看出球在誰手上：待處理的要紅、AI 閉嘴的要看得出來還有多久。 */
function StatusBadge({ c, now }: { c: ConversationSummary; now: Date }) {
  const muted = !!c.mutedUntil && c.mutedUntil > now;
  if (c.handoff) {
    return (
      <>
        <span className="badge failed">待處理</span>
        {muted && (
          <>
            <br />
            <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>
              AI 靜音至 {fmtDate(c.mutedUntil)}
            </span>
          </>
        )}
      </>
    );
  }
  if (c.handoffAt) return <span className="badge replaced">已處理</span>;
  return <span className="badge active">AI 自動</span>;
}

const who = (c: ConversationSummary) =>
  c.displayName ?? `${c.externalId.slice(0, 10)}…`;

const preview = (c: ConversationSummary) =>
  c.lastContent
    ? `${c.lastRole === "user" ? "客人" : "客服"}：${c.lastContent.slice(0, 60)}${c.lastContent.length > 60 ? "…" : ""}`
    : "—";

export default async function AdminChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kbok?: string; kberr?: string; kbover?: string; chars?: string; limit?: string }>;
}) {
  const { locale } = await params;
  const { kbok, kberr, kbover, chars, limit } = await searchParams;
  setRequestLocale(locale);

  // 未登入就送回 /admin，登入表單在那裡——在這裡再放一份只會多一個要維護的入口
  if (!(await isAdmin())) redirect("/admin");

  const [months, conversations] = await Promise.all([monthlyUsage(), recentConversations()]);

  // 有買 AI 客服的客戶站，連同他們目前的知識庫原文
  const aiTenants = await Promise.all(
    TENANTS.filter((t) => t.aiSupport).map(async (t) => ({
      tenant: t,
      plan: planOf(t.aiSupport!.plan),
      knowledge: await getKnowledge(t.slug),
      usage: (await monthlyUsage(1, t.slug))[0],
    })),
  );
  const now = new Date();
  const thisMonth = months[0];
  const open = conversations.filter((c) => c.handoff);

  return (
    <main className="page-wrap" style={{ maxWidth: 1280 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="mono-label">ADMIN / AI SUPPORT</div>
          <h1 className="section-title">AI 客服</h1>
        </div>
        <a href="/admin" className="btn-ghost">← 營運後台</a>
      </div>

      <div className="cart-section-head">本月（台北時間 {thisMonth.month}）</div>
      <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
        <Card
          label="模型費用"
          value={money(thisMonth.costUsd).usd}
          note={`約 ${money(thisMonth.costUsd).twd}　上限 US$${MONTHLY_BUDGET}`}
        />
        <Card
          label="對話數"
          value={String(thisMonth.conversations)}
          note={`客人訊息 ${thisMonth.inbound} 則`}
        />
        <Card
          label="AI 回覆"
          value={String(thisMonth.replies)}
          note={`每日上限 ${DAILY_CAP} 則`}
        />
        <Card
          label="快取命中率"
          value={`${(cacheHitRate(thisMonth) * 100).toFixed(1)}%`}
          note="知識庫前綴有命中快取，輸入成本只要十分之一"
        />
        <Card
          label="轉人次數"
          value={String(thisMonth.handoffs)}
          note={`待處理 ${open.length} 筆`}
        />
      </div>
      <p className="form-note" style={{ marginTop: "0.8rem" }}>
        ✦ 費用是用資料庫記錄的 token 數乘牌價估算，與 OpenAI 帳單會有小幅出入；
        LINE 的 reply 訊息不計費，所以這裡只有模型成本。達到每月上限後客服會改為
        一律請客人留聯絡方式，不會沒人理。
      </p>

      {open.length > 0 && (
        <>
          <div className="cart-section-head">⚠️ 等你回的對話（{open.length}）</div>
          <div className="form-feedback err" style={{ marginBottom: "0.8rem" }}>
            這些對話已判定需要專人。LINE 的對話在靜音期間 AI 不會自動回覆，
            請到 LINE 官方帳號的聊天分頁親自回，處理完回來按「標記已處理」讓 AI 接回。
          </div>
          <ConversationTable rows={open} now={now} />
        </>
      )}

      <div className="cart-section-head">所有對話（{conversations.length}）</div>
      <ConversationTable rows={conversations} now={now} />

      <div className="cart-section-head">客戶站的 AI 客服（{aiTenants.length}）</div>
      {kbok === "1" && <div className="form-feedback ok">知識庫已更新，下一則訊息就會用新的內容。</div>}
      {kbover === "1" && (
        <div className="form-feedback err">
          沒有儲存：這個站的方案上限是 {limit} 字，你貼了 {chars} 字。
          請精簡內容，或把方案升一階（上限寫在 src/lib/ai-plans.ts 的 knowledgeChars）。
        </div>
      )}
      {kberr === "1" && (
        <div className="form-feedback err">這個站沒有啟用 AI 客服，先到 tenants.ts 加上 aiSupport。</div>
      )}
      {aiTenants.length === 0 ? (
        <p className="form-note">
          目前沒有客戶站啟用 AI 客服。要開通一個站：在 src/lib/tenants.ts 的該筆加上
          <code> aiSupport: {"{"} plan: &quot;lite&quot; {"}"}</code>，部署後這裡就會出現知識庫編輯欄位。
        </p>
      ) : (
        aiTenants.map(({ tenant, plan, knowledge, usage }) => (
          <div key={tenant.slug} style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "baseline", flexWrap: "wrap" }}>
              <strong>{tenant.name}</strong>
              <span className="badge active">{plan.tier}</span>
              <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                本月 {usage.conversations} / {plan.monthlyConversations.toLocaleString("en-US")} 組對話
                {money(usage.costUsd).usd} / 上限 US${plan.monthlyBudgetUsd}
                webhook：/api/line/webhook/{tenant.slug}
              </span>
            </div>
            <form method="post" action="/api/admin/chat-knowledge" style={{ marginTop: "0.6rem" }}>
              <input type="hidden" name="tenantId" value={tenant.slug} />
              <textarea
                name="content"
                defaultValue={knowledge}
                rows={10}
                className="form-input"
                style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}
                placeholder="貼上這個客戶的 FAQ、價目與服務說明。AI 只會用這裡面的內容回答。"
              />
              <button type="submit" className="btn-ghost" style={{ marginTop: "0.5rem" }}>
                儲存知識庫
              </button>
            </form>
          </div>
        ))
      )}
      <p className="form-note" style={{ marginTop: "-0.6rem" }}>
        ✦ 這裡存的內容會原封不動變成那個站客服的參考資料。寫得越具體（價格、時間、條件）
        它越答得出來；寫不到的事它會說不確定並請客人留聯絡方式，不會自己編。
        主站自己的知識庫不在這裡——它是從價目表當場算出來的，調價後客服立刻跟著改口。
      </p>

      <div className="cart-section-head">月用量報表</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={headStyle}>月份</th>
              <th style={headStyle}>對話</th>
              <th style={headStyle}>客人訊息</th>
              <th style={headStyle}>AI 回覆</th>
              <th style={headStyle}>轉人</th>
              <th style={headStyle}>輸入 token</th>
              <th style={headStyle}>其中快取</th>
              <th style={headStyle}>輸出 token</th>
              <th style={headStyle}>估算費用</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month}>
                <td style={cellStyle}><code>{m.month}</code></td>
                <td style={cellStyle}>{m.conversations}</td>
                <td style={cellStyle}>{m.inbound}</td>
                <td style={cellStyle}>{m.replies}</td>
                <td style={cellStyle}>{m.handoffs}</td>
                <td style={cellStyle}>{m.inputTokens.toLocaleString()}</td>
                <td style={cellStyle}>
                  {m.cacheReadTokens.toLocaleString()}
                  <br />
                  <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>
                    {(cacheHitRate(m) * 100).toFixed(1)}%
                  </span>
                </td>
                <td style={cellStyle}>{m.outputTokens.toLocaleString()}</td>
                <td style={cellStyle}>
                  {money(m.costUsd).usd}
                  <br />
                  <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>
                    約 {money(m.costUsd).twd}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="form-note" style={{ marginTop: "0.8rem" }}>
        ✦ 跨月的對話會在每個有訊息的月份各算一次，所以「對話」欄加總會大於實際對話數。
        轉人次數以首次判定的時間歸月。
      </p>
      <p className="form-note" style={{ marginTop: "0.4rem" }}>
        ✦ 「我自己接」會讓該 LINE 對話的 AI 閉嘴 {MUTE_HOURS} 小時，客人的訊息照樣存檔並寄信給你。
        官網的聊天視窗沒有真人介面，所以不提供靜音。
      </p>
    </main>
  );
}

function ConversationTable({ rows, now }: { rows: ConversationSummary[]; now: Date }) {
  if (rows.length === 0) {
    return <p className="form-note">目前沒有對話紀錄。</p>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={headStyle}>#</th>
            <th style={headStyle}>站別</th>
            <th style={headStyle}>來源</th>
            <th style={headStyle}>對象</th>
            <th style={headStyle}>狀態</th>
            <th style={headStyle}>最後一句</th>
            <th style={headStyle}>則數</th>
            <th style={headStyle}>最後時間</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td style={cellStyle}>
                <a href={`/admin/chat/${c.id}`} style={{ color: "var(--moss)" }}>
                  {c.id}
                </a>
              </td>
              <td style={cellStyle}>
                {c.tenantId === "avalo" ? "Avalo 主站" : (getTenant(c.tenantId)?.name ?? c.tenantId)}
              </td>
              <td style={cellStyle}>{c.channel === "line" ? "LINE" : "官網"}</td>
              <td style={cellStyle}>
                {who(c)}
                <br />
                <span
                  style={{
                    color: "var(--muted)",
                    fontSize: "0.68rem",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {c.externalId}
                </span>
              </td>
              <td style={cellStyle}>
                <StatusBadge c={c} now={now} />
                {c.handoffReason && (
                  <>
                    <br />
                    <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>
                      {c.handoffReason}
                    </span>
                  </>
                )}
              </td>
              <td style={{ ...cellStyle, maxWidth: 380, whiteSpace: "pre-wrap" }}>
                {preview(c)}
              </td>
              <td style={cellStyle}>{c.messageCount}</td>
              <td style={cellStyle}>{fmtDate(c.lastAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
