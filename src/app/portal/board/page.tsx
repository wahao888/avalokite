import { notFound } from "next/navigation";
import { getHostTenant, getTenantSession } from "@/lib/tenant-auth";
import { getFlavorBoard } from "@/lib/tenant-data";
import LoginForm from "../LoginForm";
// 口味目錄住在該站的程式碼裡（純資料模組，沒有副作用）。
// 後台只是把它列出來讓店家勾，不需要另一份 DB 清單。
import { listFlavors } from "@/app/sites/monsieurlong/_data/flavors";

export const dynamic = "force-dynamic";

/**
 * 今日供應板編輯畫面。
 *
 * 刻意做成純 HTML 表單（沒有 JS）：店家多半在手機上、開店前趕時間用，
 * 勾一勾、按送出、看到結果，不需要等任何東西載入。
 */
export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const hostTenant = await getHostTenant();
  if (!hostTenant) notFound();
  // 沒開這個功能的租戶不該看到這一頁
  if (!hostTenant.flavorBoard) notFound();

  const tenant = await getTenantSession();
  if (!tenant) return <LoginForm tenantName={hostTenant.name} error={sp.error} />;

  const [flavors, board] = await Promise.all([listFlavors(), getFlavorBoard(tenant.slug)]);
  const picked = new Set(board.slugs);

  const updated = board.updatedAt
    ? new Intl.DateTimeFormat("zh-TW", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Taipei",
      }).format(board.updatedAt)
    : null;

  return (
    <main className="p-wrap">
      <div className="p-head">
        <div>
          <h1 className="p-title">今日 Gelato 口味</h1>
          <p className="p-sub">
            勾選今天櫃上有的口味，按下儲存，官網首頁與口味頁就會立刻換成這一份。
          </p>
        </div>
        <div className="p-actions">
          <a className="p-btn p-btn-ghost" href="/portal">
            表單管理
          </a>
          <form method="post" action="/api/portal/logout">
            <button type="submit" className="p-btn-link">
              登出
            </button>
          </form>
        </div>
      </div>

      {sp.saved === "1" && (
        <div className="p-stats">
          <div className="p-stat">
            已儲存<b>✓</b>
          </div>
        </div>
      )}

      <div className="p-stats">
        <div className="p-stat">
          目前勾選<b>{picked.size}</b>
        </div>
        <div className="p-stat">
          口味目錄<b>{flavors.length}</b>
        </div>
        {updated && (
          <div className="p-stat">
            上次更新<b style={{ fontSize: 15 }}>{updated}</b>
          </div>
        )}
      </div>

      <form method="post" action="/api/portal/board" className="p-board-form">
        <fieldset className="p-fieldset">
          <legend>今天有的口味</legend>
          <div className="p-checks">
            {flavors.map((f) => (
              <label className="p-check" key={f.slug}>
                <input type="checkbox" name="slug" value={f.slug} defaultChecked={picked.has(f.slug)} />
                <span className="p-swatch" style={{ background: f.color }} aria-hidden="true" />
                <span>
                  {f.nameZh}
                  <small>{f.nameEn}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="p-fieldset">
          <legend>目錄裡還沒有的新口味</legend>
          <p className="p-sub">
            一行一個。今天就會顯示在官網上（只有名字，沒有插畫與介紹）。
            之後要正式收進目錄、加上插畫與文案，再告訴 Avalo 就好。
          </p>
          <textarea
            name="extras"
            rows={4}
            placeholder={"例：\n黑糖粉粿\n仙草牛奶"}
            defaultValue={board.extras.join("\n")}
          />
        </fieldset>

        <fieldset className="p-fieldset">
          <legend>今日公告（選填）</legend>
          <input
            type="text"
            name="note"
            maxLength={120}
            placeholder="例：今天提早售完，明天見！"
            defaultValue={board.note ?? ""}
          />
        </fieldset>

        <div className="p-actions">
          <button type="submit" className="p-btn">
            儲存並更新官網
          </button>
        </div>
      </form>
    </main>
  );
}
