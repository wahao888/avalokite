"use client";

// 後台終止定期定額：終止後綠界無法重啟，送出前二次確認避免誤觸
export default function CancelSubButton({ id }: { id: number }) {
  return (
    <form
      method="post"
      action="/api/admin/cancel-subscription"
      onSubmit={(e) => {
        if (!confirm("確定終止這筆定期定額扣款？終止後無法重啟，需重新下單。")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="cart-remove" style={{ color: "#8a3b2a" }}>
        終止扣款
      </button>
    </form>
  );
}
