"use client";

// 後台標記網站已上線：這一按就開始向客戶收月費，且承諾期自今天起算，
// 所以確認訊息要把兩個後果都講出來，不能只寫「確定嗎」。
export default function LaunchSubButton({ id, months }: { id: number; months: number | null }) {
  return (
    <form
      method="post"
      action="/api/admin/launch-subscription"
      onSubmit={(e) => {
        const term = months ? `，承諾期 ${months} 個月自今天起算` : "";
        if (!confirm(`標記網站已上線驗收？系統會立刻寄出定期定額授權連結${term}。`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="cart-remove" style={{ color: "var(--moss)" }}>
        標記已上線
      </button>
    </form>
  );
}
