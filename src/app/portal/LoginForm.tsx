const MESSAGES: Record<string, string> = {
  "1": "密碼不正確，請再試一次。",
  locked: "嘗試次數過多，請 10 分鐘後再試。",
};

export default function LoginForm({
  tenantName,
  error,
}: {
  tenantName: string;
  error?: string;
}) {
  return (
    <main className="p-login">
      <h1>{tenantName}・表單管理</h1>
      <p>輸入 Avalo 提供的密碼即可查看網站送出的表單。</p>
      {error && <div className="p-error">{MESSAGES[error] ?? "登入失敗，請再試一次。"}</div>}
      <form method="post" action="/api/portal/login">
        <input
          type="password"
          name="password"
          placeholder="密碼"
          autoComplete="current-password"
          autoFocus
          required
        />
        <button type="submit" className="p-btn">登入</button>
      </form>
    </main>
  );
}
